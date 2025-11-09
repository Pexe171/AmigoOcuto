import { z } from 'zod';
import {
  insertEvent,
  listAllEvents,
  findEventById,
  updateEvent,
  appendDrawHistoryEntry,
  EventRecord,
  addParticipantToEvent,
  removeParticipantFromEvent,
  removeLastDrawHistoryEntry,
} from '../database/eventRepository';
import { createEventTicket, deleteEventTickets } from '../database/eventTicketRepository';
import { listVerifiedParticipants, getParticipantOrFail, Participant } from './participantService';
import { sendDrawEmail, sendDrawCancellationEmail } from './emailService';
import { generateTicketCode } from '../utils/codeGenerator';
import { getGiftList, getParticipantsWithoutGiftItems } from './giftListService';

export type EventDocument = EventRecord;

const eventSchema = z.object({
  name: z.string().min(4, 'Informe um nome descritivo para o evento.'),
  participantIds: z.array(z.string().uuid()).optional(),
});

const drawSchema = z.object({
  eventId: z.string().uuid(),
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

const ensureNoSelfAssignment = <T extends { id: string }>(participants: T[]): T[] => {
  if (participants.length < 2) {
    throw new Error('São necessários pelo menos dois participantes verificados para o sorteio.');
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const shuffled = shuffle(participants);
    let valid = true;
    for (let i = 0; i < participants.length; i += 1) {
      if (participants[i]!.id === shuffled[i]!.id) {
        valid = false;
        break;
      }
    }
    if (valid) {
      return shuffled;
    }
  }

  return participants.map((_, index) => participants[(index + 1) % participants.length]!);
};

export const createEvent = async (input: z.infer<typeof eventSchema>): Promise<EventDocument> => {
  const data = eventSchema.parse(input);

  // Use provided participant IDs or default to an empty array.
  // This allows creating an event even if there are no verified participants yet.
  const participantIds = data.participantIds ?? [];

  const uniqueIds = Array.from(new Set(participantIds));

  return insertEvent({
    name: data.name,
    participants: uniqueIds,
    status: 'ativo',
  });
};

export const listEvents = async (): Promise<EventDocument[]> => {
  return listAllEvents();
};

export const listActiveEventsForRegistration = async (): Promise<Array<{
  id: string;
  name: string;
  status: EventDocument['status'];
  participantCount: number;
  createdAt: Date;
}>> => {
  const events = listAllEvents().filter((event) => event.status === 'ativo');
  return events.map((event) => ({
    id: event.id,
    name: event.name,
    status: event.status,
    participantCount: event.participants.length,
    createdAt: event.createdAt,
  }));
};

export const cancelEvent = async (eventId: string): Promise<EventDocument> => {
  const event = findEventById(eventId);
  if (!event) {
    throw new Error('Evento não encontrado.');
  }
  if (event.status === 'cancelado') {
    return event;
  }
  const updated = updateEvent(eventId, { status: 'cancelado' });
  if (!updated) {
    throw new Error('Não foi possível atualizar o evento.');
  }
  return updated;
};

export const drawEvent = async (input: z.infer<typeof drawSchema>): Promise<{ event: EventDocument; tickets: number }> => {
  const data = drawSchema.parse(input);
  const event = findEventById(data.eventId);
  if (!event) {
    throw new Error('Evento não encontrado.');
  }
  if (event.status === 'cancelado') {
    throw new Error('Eventos cancelados não podem receber sorteios.');
  }
  if (event.status === 'sorteado') {
    throw new Error('Este evento já foi sorteado. Crie um novo evento para refazer.');
  }

  const participants = await Promise.all(event.participants.map((id) => getParticipantOrFail(id)));
  const verifiedParticipants = participants.filter((participant) => participant.emailVerified);

  if (verifiedParticipants.length < 2) {
    throw new Error('São necessários pelo menos dois participantes verificados para o sorteio.');
  }

  if (verifiedParticipants.length % 2 !== 0) {
    throw new Error('O sorteio exige um número par de participantes verificados.');
  }

  const participantIds = verifiedParticipants.map((participant) => participant.id);
  const participantsWithoutLists = getParticipantsWithoutGiftItems(participantIds);

  if (participantsWithoutLists.length > 0) {
    const missingNames = verifiedParticipants
      .filter((participant) => participantsWithoutLists.includes(participant.id))
      .map((participant) => `${participant.firstName} ${participant.secondName}`.trim());
    const formattedNames = missingNames.length > 1
      ? `${missingNames.slice(0, -1).join(', ')} e ${missingNames.slice(-1)}`
      : missingNames[0] ?? '';
    const subject = missingNames.length > 1 ? 'os participantes' : 'o participante';
    const verb = missingNames.length > 1 ? 'não cadastraram' : 'não cadastrou';
    throw new Error(
      `Não é possível realizar o sorteio porque ${subject} ${formattedNames} ${verb} a lista de presentes. Peça para preencher antes de tentar novamente.`,
    );
  }

  const assignments = ensureNoSelfAssignment<Participant>(verifiedParticipants);

  const createdTicketIds: string[] = [];

  for (let i = 0; i < verifiedParticipants.length; i += 1) {
    const participant = verifiedParticipants[i]!;
    const assigned = assignments[i]!;
    const ticketCode = generateTicketCode();

    const ticket = createEventTicket(event.id, participant.id, assigned.id, ticketCode);
    createdTicketIds.push(ticket.id);

    const giftList = getGiftList(assigned.id);
    const gifts = giftList ? giftList.items : [];

    await sendDrawEmail(
      {
        id: participant.id,
        firstName: participant.firstName,
        secondName: participant.secondName,
        isChild: participant.isChild,
        email: participant.email ?? null,
        primaryGuardianEmail: participant.primaryGuardianEmail ?? null,
        guardianEmails: participant.guardianEmails ?? null,
      },
      {
        id: assigned.id,
        firstName: assigned.firstName,
        secondName: assigned.secondName,
        isChild: assigned.isChild,
        email: assigned.email ?? null,
        primaryGuardianEmail: assigned.primaryGuardianEmail ?? null,
        guardianEmails: assigned.guardianEmails ?? null,
      },
      ticketCode,
      gifts,
    );
  }

  const updated = appendDrawHistoryEntry(event.id, { tickets: createdTicketIds, drawnAt: new Date() });
  if (!updated) {
    throw new Error('Não foi possível atualizar o histórico do evento após o sorteio.');
  }

  return { event: updated, tickets: createdTicketIds.length };
};

export const undoLastDraw = async (input: z.infer<typeof drawSchema>): Promise<EventDocument> => {
  const data = drawSchema.parse(input);
  const event = findEventById(data.eventId);
  if (!event) {
    throw new Error('Evento não encontrado.');
  }
  if (event.status === 'ativo') {
    throw new Error('Não há sorteio para desfazer neste evento.');
  }
  if (event.drawHistory.length === 0) {
    throw new Error('Não há histórico de sorteio para desfazer.');
  }

  const lastDraw = event.drawHistory[event.drawHistory.length - 1]!;
  const ticketIds = lastDraw.tickets;

  // Delete the tickets
  deleteEventTickets(ticketIds);

  // Remove the last draw history entry
  const updatedEvent = removeLastDrawHistoryEntry(data.eventId);
  if (!updatedEvent) {
    throw new Error('Não foi possível atualizar o evento após desfazer o sorteio.');
  }

  // Send cancellation emails to all participants
  const participants = await Promise.all(event.participants.map((id) => getParticipantOrFail(id)));
  const verifiedParticipants = participants.filter((participant) => participant.emailVerified);

  for (const participant of verifiedParticipants) {
    await sendDrawCancellationEmail({
      id: participant.id,
      firstName: participant.firstName,
      secondName: participant.secondName,
      isChild: participant.isChild,
      email: participant.email ?? null,
      primaryGuardianEmail: participant.primaryGuardianEmail ?? null,
      guardianEmails: participant.guardianEmails ?? null,
    });
  }

  return updatedEvent;
};

export const getEventHistory = async (eventId: string): Promise<{
  name: string;
  status: string;
  sorteios: { drawnAt: Date; participantes: number }[];
}> => {
  const event = findEventById(eventId);
  if (!event) {
    throw new Error('Evento não encontrado.');
  }

  return {
    name: event.name,
    status: event.status,
    sorteios: event.drawHistory.map((entry) => ({
      drawnAt: entry.drawnAt,
      participantes: entry.tickets.length,
    })),
  };
};

export const includeParticipantInEvent = (eventId: string, participantId: string): void => {
  const updated = addParticipantToEvent(eventId, participantId);
  if (!updated) {
    throw new Error('Evento não encontrado para associar participante.');
  }
};

export const excludeParticipantFromEvent = (eventId: string, participantId: string): void => {
  const updated = removeParticipantFromEvent(eventId, participantId);
  if (!updated) {
    throw new Error('Evento não encontrado para remover participante.');
  }
};
