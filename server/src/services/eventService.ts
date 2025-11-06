import { z } from 'zod';
import { Types } from 'mongoose';
import { EventModel, EventDocument } from '../models/Event';
import { ParticipantDocument } from '../models/Participant';
import { TicketModel, TicketDocument } from '../models/Ticket';
import { listVerifiedParticipants, getParticipantOrFail } from './participantService';
import { sendDrawEmail } from './emailService';
import { generateTicketCode } from '../utils/codeGenerator';
import { getGiftItems } from './giftListService';
import { HttpError } from '../utils/httpError';

/**
 * Regras de negócio dos eventos e sorteios. Esta camada garante que só sorteamos
 * participantes verificados, que ninguém tira a si próprio e que os e-mails são enviados.
 */

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const eventSchema = z.object({
  name: z.string().min(4, 'Informe um nome descritivo para o evento.'),
  participantIds: z.array(objectIdSchema).optional()
});

const drawSchema = z.object({
  eventId: objectIdSchema
});

const shuffle = <T>(input: T[]): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = temp;
  }
  return arr;
};

const ensureNoSelfAssignment = <T>(participants: T[]): T[] => {
  if (participants.length < 2) {
    throw HttpError.badRequest('São necessários pelo menos dois participantes verificados para o sorteio.');
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const shuffled = shuffle(participants);
    let valid = true;
    for (let i = 0; i < participants.length; i += 1) {
      if (participants[i] === shuffled[i]) {
        valid = false;
        break;
      }
    }
    if (valid) {
      return shuffled;
    }
  }

  // fallback usando rotação
  return participants.map((_, index) => participants[(index + 1) % participants.length]!);
};

export const createEvent = async (input: z.infer<typeof eventSchema>): Promise<EventDocument> => {
  const data = eventSchema.parse(input);

  const participantIds = data.participantIds ?? (await listVerifiedParticipants()).map((p) => p.id);
  if (participantIds.length < 2) {
    throw HttpError.badRequest('Cadastre pelo menos dois participantes verificados antes de criar o evento.');
  }

  const uniqueIds = Array.from(new Set(participantIds));

  const event = new EventModel({
    name: data.name,
    participants: uniqueIds.map((id) => new Types.ObjectId(id)),
    status: 'ativo'
  });

  await event.save();
  return event;
};

export const listEvents = async (): Promise<EventDocument[]> => {
  return EventModel.find().sort({ createdAt: -1 }).exec();
};

export const cancelEvent = async (eventId: string): Promise<EventDocument> => {
  const event = await EventModel.findById(eventId);
  if (!event) {
    throw HttpError.notFound('Evento não encontrado.');
  }
  event.status = 'cancelado';
  await event.save();
  return event;
};

export const drawEvent = async (input: z.infer<typeof drawSchema>): Promise<{ event: EventDocument; tickets: number }> => {
  const data = drawSchema.parse(input);
  const event = await EventModel.findById(data.eventId);
  if (!event) {
    throw HttpError.notFound('Evento não encontrado.');
  }
  if (event.status === 'cancelado') {
    throw HttpError.conflict('Eventos cancelados não podem receber sorteios.');
  }
  if (event.status === 'sorteado') {
    throw HttpError.conflict('Este evento já foi sorteado. Crie um novo evento para refazer.');
  }

  const participants = await Promise.all(event.participants.map((id) => getParticipantOrFail(id.toString())));
  const verifiedParticipants = participants.filter((participant) => participant.emailVerified);

  if (verifiedParticipants.length < 2) {
    throw HttpError.badRequest('São necessários pelo menos dois participantes verificados para o sorteio.');
  }

  if (verifiedParticipants.length % 2 !== 0) {
    throw HttpError.badRequest('O sorteio exige um número par de participantes verificados.');
  }

  const assignments = ensureNoSelfAssignment<ParticipantDocument>(verifiedParticipants);

  const tickets: TicketDocument[] = [];

  for (let i = 0; i < verifiedParticipants.length; i += 1) {
    const participant = verifiedParticipants[i]!;
    const assigned = assignments[i]!;
    const ticketCode = generateTicketCode();

    const ticket = new TicketModel({
      event: event._id,
      participant: participant._id,
      assignedParticipant: assigned._id,
      ticketCode
    });

    await ticket.save();
    tickets.push(ticket);

    const gifts = await getGiftItems(assigned.id);
    await sendDrawEmail(participant, assigned, ticketCode, gifts);
  }

  event.status = 'sorteado';
  event.drawHistory.push({ tickets: tickets.map((ticket) => ticket._id as Types.ObjectId), drawnAt: new Date() });
  await event.save();

  return { event, tickets: tickets.length };
};

export const getEventHistory = async (eventId: string): Promise<{ name: string; status: string; sorteios: { drawnAt: Date; participantes: number }[] }> => {
  const event = await EventModel.findById(eventId);
  if (!event) {
    throw HttpError.notFound('Evento não encontrado.');
  }

  return {
    name: event.name,
    status: event.status,
    sorteios: event.drawHistory.map((entry) => ({
      drawnAt: entry.drawnAt,
      participantes: entry.tickets.length
    }))
  };
};
