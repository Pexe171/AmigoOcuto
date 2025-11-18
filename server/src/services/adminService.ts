import { collectParticipantRecipients, sendTestEmailToParticipant, sendGiftListWarningEmail } from './emailService';
import { ensureNames } from '../utils/nameUtils';
import {
  findAllParticipants,
  findParticipantById,
  deleteParticipant as removeParticipantRecord,
  findParticipantByPrimaryEmail,
  insertParticipant,
} from '../database/participantRepository';
import {
  findGiftListByParticipantId,
  findGiftListsByParticipantIds,
  deleteGiftListByParticipantId,
  GiftItem,
} from '../database/giftListRepository';
import { listVerifiedParticipants } from './participantService';
import { findEventById } from '../database/eventRepository';

const collectContactEmails = (
  email?: string | null,
  primaryGuardianEmail?: string | null,
  guardianEmails: string[] = [],
): string[] => {
  const unique = new Set<string>();
  if (email) {
    unique.add(email);
  }
  if (primaryGuardianEmail) {
    unique.add(primaryGuardianEmail);
  }
  guardianEmails.forEach((guardianEmail) => {
    if (guardianEmail) {
      unique.add(guardianEmail);
    }
  });
  return Array.from(unique);
};

export type AdminParticipantSummary = {
  id: string;
  firstName: string;
  secondName: string;
  fullName: string;
  email?: string;
  isChild: boolean;
  emailVerified: boolean;
  attendingInPerson?: boolean;
  primaryGuardianEmail?: string;
  contactEmails: string[];
  giftCount: number;
  createdAt: string;
};

export type AdminParticipantDetails = {
  id: string;
  firstName: string;
  secondName: string;
  fullName: string;
  email?: string;
  isChild: boolean;
  emailVerified: boolean;
  attendingInPerson?: boolean;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  contactEmails: string[];
  gifts: GiftItem[];
  createdAt: string;
  updatedAt: string;
};

export type AdminRemovedParticipant = {
  id: string;
  fullName: string;
};

export const listParticipantsWithGiftSummary = async (): Promise<AdminParticipantSummary[]> => {
  const participants = findAllParticipants().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const participantIds = participants.map((participant) => participant.id);
  const giftLists = findGiftListsByParticipantIds(participantIds);
  const giftMap = new Map<string, GiftItem[]>();

  giftLists.forEach((list) => {
    giftMap.set(list.participantId, list.items);
  });

  return participants.map((participant) => {
    const names = ensureNames({
      firstName: participant.firstName,
      secondName: participant.secondName,
    });

    const contactEmails = collectContactEmails(
      participant.email,
      participant.primaryGuardianEmail,
      participant.guardianEmails ?? [],
    );

    const summary: AdminParticipantSummary = {
      id: participant.id,
      firstName: participant.firstName,
      secondName: participant.secondName,
      fullName: names.fullName,
      isChild: participant.isChild,
      emailVerified: participant.emailVerified,
      contactEmails,
      giftCount: giftMap.get(participant.id)?.length ?? 0,
      createdAt: participant.createdAt,
    };

    if (participant.email) {
      summary.email = participant.email;
    }
    if (typeof participant.attendingInPerson === 'boolean') {
      summary.attendingInPerson = participant.attendingInPerson;
    }
    if (participant.primaryGuardianEmail) {
      summary.primaryGuardianEmail = participant.primaryGuardianEmail;
    }

    return summary;
  });
};

export const getParticipantDetailsForAdmin = async (
  participantId: string,
): Promise<AdminParticipantDetails> => {
  const participant = findParticipantById(participantId);
  if (!participant) {
    throw new Error('Participante não encontrado.');
  }

  const giftList = findGiftListByParticipantId(participant.id);
  const names = ensureNames({
    firstName: participant.firstName,
    secondName: participant.secondName,
  });

  const guardianEmails = participant.guardianEmails ?? [];
  const contactEmails = collectContactEmails(
    participant.email,
    participant.primaryGuardianEmail,
    guardianEmails,
  );

  const details: AdminParticipantDetails = {
    id: participant.id,
    firstName: participant.firstName,
    secondName: participant.secondName,
    fullName: names.fullName,
    isChild: participant.isChild,
    emailVerified: participant.emailVerified,
    guardianEmails,
    contactEmails,
    gifts: giftList?.items ?? [],
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
  };

  if (participant.email) {
    details.email = participant.email;
  }
  if (typeof participant.attendingInPerson === 'boolean') {
    details.attendingInPerson = participant.attendingInPerson;
  }
  if (participant.primaryGuardianEmail) {
    details.primaryGuardianEmail = participant.primaryGuardianEmail;
  }

  return details;
};

export const deleteParticipantForAdmin = (participantId: string): AdminRemovedParticipant => {
  const participant = findParticipantById(participantId);
  if (!participant) {
    throw new Error('Participante não encontrado.');
  }

  const names = ensureNames({
    firstName: participant.firstName,
    secondName: participant.secondName,
  });

  deleteGiftListByParticipantId(participantId);
  removeParticipantRecord(participantId);

  return { id: participantId, fullName: names.fullName };
};

export const sendTestEmailsToAllParticipants = async (): Promise<{
  participants: number;
  recipients: number;
}> => {
  const verifiedParticipants = await listVerifiedParticipants();
  let participantsNotified = 0;
  let totalRecipients = 0;

  for (const participant of verifiedParticipants) {
    const recipients = collectParticipantRecipients({
      isChild: participant.isChild,
      email: participant.email ?? null,
      primaryGuardianEmail: participant.primaryGuardianEmail ?? null,
      guardianEmails: participant.guardianEmails ?? [],
    });

    if (recipients.length === 0) {
      continue;
    }

    participantsNotified += 1;
    totalRecipients += recipients.length;

    await sendTestEmailToParticipant(
      {
        id: participant.id,
        firstName: participant.firstName,
        secondName: participant.secondName,
        isChild: participant.isChild,
        email: participant.email ?? null,
        primaryGuardianEmail: participant.primaryGuardianEmail ?? null,
        guardianEmails: participant.guardianEmails ?? [],
      },
      recipients,
    );
  }

  return { participants: participantsNotified, recipients: totalRecipients };
};

export const sendGiftListWarningEmailsToAllParticipants = async (): Promise<{
  participants: number;
  recipients: number;
}> => {
  const verifiedParticipants = await listVerifiedParticipants();
  let participantsNotified = 0;
  let totalRecipients = 0;

  for (const participant of verifiedParticipants) {
    const recipients = collectParticipantRecipients({
      isChild: participant.isChild,
      email: participant.email ?? null,
      primaryGuardianEmail: participant.primaryGuardianEmail ?? null,
      guardianEmails: participant.guardianEmails ?? [],
    });

    if (recipients.length === 0) {
      continue;
    }

    participantsNotified += 1;
    totalRecipients += recipients.length;

    await sendGiftListWarningEmail({
      id: participant.id,
      firstName: participant.firstName,
      secondName: participant.secondName,
      isChild: participant.isChild,
      email: participant.email ?? null,
      primaryGuardianEmail: participant.primaryGuardianEmail ?? null,
      guardianEmails: participant.guardianEmails ?? [],
    });
  }

  return { participants: participantsNotified, recipients: totalRecipients };
};

export const sendGiftListWarningEmailsToEventParticipants = async (eventId: string): Promise<{
  participants: number;
  recipients: number;
}> => {
  const event = findEventById(eventId);
  if (!event) {
    throw new Error('Evento não encontrado.');
  }
  const participantIds = event.participants;
  const verifiedParticipants = await listVerifiedParticipants();
  const eventParticipants = verifiedParticipants.filter(p => participantIds.includes(p.id));
  let participantsNotified = 0;
  let totalRecipients = 0;

  for (const participant of eventParticipants) {
    const recipients = collectParticipantRecipients({
      isChild: participant.isChild,
      email: participant.email ?? null,
      primaryGuardianEmail: participant.primaryGuardianEmail ?? null,
      guardianEmails: participant.guardianEmails ?? [],
    });

    if (recipients.length === 0) {
      continue;
    }

    participantsNotified += 1;
    totalRecipients += recipients.length;

    await sendGiftListWarningEmail({
      id: participant.id,
      firstName: participant.firstName,
      secondName: participant.secondName,
      isChild: participant.isChild,
      email: participant.email ?? null,
      primaryGuardianEmail: participant.primaryGuardianEmail ?? null,
      guardianEmails: participant.guardianEmails ?? [],
    });
  }

  return { participants: participantsNotified, recipients: totalRecipients };
};

export const exportParticipantsData = async (): Promise<string> => {
  const participants = findAllParticipants().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const participantIds = participants.map((participant) => participant.id);
  const giftLists = findGiftListsByParticipantIds(participantIds);
  const giftMap = new Map<string, GiftItem[]>();

  giftLists.forEach((list) => {
    giftMap.set(list.participantId, list.items);
  });

  const csvHeaders = [
    'ID',
    'Nome Completo',
    'Primeiro Nome',
    'Segundo Nome',
    'Email',
    'Tipo',
    'Email Verificado',
    'Presença Presencial',
    'Email Responsável Principal',
    'Emails Responsáveis Adicionais',
    'Emails de Contato',
    'Quantidade de Presentes',
    'Data de Inscrição',
    'Data de Atualização'
  ];

  const csvRows = participants.map((participant) => {
    const names = ensureNames({
      firstName: participant.firstName,
      secondName: participant.secondName,
    });

    const contactEmails = collectContactEmails(
      participant.email,
      participant.primaryGuardianEmail,
      participant.guardianEmails ?? [],
    );

    const guardianEmailsStr = participant.guardianEmails?.join('; ') ?? '';
    const contactEmailsStr = contactEmails.join('; ');
    const giftCount = giftMap.get(participant.id)?.length ?? 0;

    return [
      participant.id,
      `"${names.fullName}"`,
      `"${participant.firstName}"`,
      `"${participant.secondName}"`,
      participant.email ? `"${participant.email}"` : '',
      participant.isChild ? 'Criança' : 'Adulto',
      participant.emailVerified ? 'Sim' : 'Não',
      participant.attendingInPerson ? 'Sim' : 'Não',
      participant.primaryGuardianEmail ? `"${participant.primaryGuardianEmail}"` : '',
      `"${guardianEmailsStr}"`,
      `"${contactEmailsStr}"`,
      giftCount.toString(),
      participant.createdAt,
      participant.updatedAt
    ];
  });

  const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
  return csvContent;
};

export const importParticipantsData = async (csvData: string): Promise<{ imported: number; errors: string[] }> => {
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('Arquivo CSV inválido. Deve conter pelo menos cabeçalhos e uma linha de dados.');
  }

  const headers = lines[0]!.split(',').map(h => h.trim());
  const expectedHeaders = [
    'Primeiro Nome',
    'Segundo Nome',
    'Tipo',
    'Email Verificado',
    'Presença Presencial',
    'Email',
    'Email Responsável Principal',
    'Emails Responsáveis Adicionais'
  ];

  // Check if headers match expected (at least the required ones)
  const hasRequiredHeaders = expectedHeaders.slice(0, 4).every(h => headers.includes(h));
  if (!hasRequiredHeaders) {
    throw new Error('Cabeçalhos do CSV inválidos. Verifique se o arquivo foi exportado corretamente.');
  }

  const rows = lines.slice(1);
  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const cols = parseCSVRow(row);
    if (cols.length !== headers.length) {
      errors.push(`Linha ${i + 2}: Número de colunas incorreto.`);
      continue;
    }

    const data: Record<string, string> = {};
    headers.forEach((header, index) => {
      data[header] = cols[index]?.trim() || '';
    });

    try {
      const firstName = data['Primeiro Nome'];
      const secondName = data['Segundo Nome'];
      const tipo = data['Tipo'];
      const emailVerificado = data['Email Verificado'];
      const presencaPresencial = data['Presença Presencial'];
      const email = data['Email'];
      const primaryGuardianEmail = data['Email Responsável Principal'];
      const guardianEmailsStr = data['Emails Responsáveis Adicionais'];

      if (!firstName || !secondName) {
        errors.push(`Linha ${i + 2}: Primeiro nome e segundo nome são obrigatórios.`);
        continue;
      }

      const isChild = tipo === 'Criança';
      const emailVerified = emailVerificado === 'Sim';
      const attendingInPerson = presencaPresencial === 'Sim';

      const participantData: any = {
        firstName,
        secondName,
        isChild,
        emailVerified,
        attendingInPerson,
      };

      if (email) {
        participantData.email = email.toLowerCase();
      }

      if (primaryGuardianEmail) {
        participantData.primaryGuardianEmail = primaryGuardianEmail.toLowerCase();
      }

      if (guardianEmailsStr) {
        participantData.guardianEmails = guardianEmailsStr.split(';').map((e: string) => e.trim().toLowerCase()).filter((e: string) => e);
      }

      // Validate data
      if (isChild && !primaryGuardianEmail) {
        errors.push(`Linha ${i + 2}: Crianças precisam de um e-mail principal de responsável.`);
        continue;
      }

      if (!isChild && !email) {
        errors.push(`Linha ${i + 2}: Adultos precisam informar um e-mail para contato.`);
        continue;
      }

      // Check for duplicates
      if (!isChild && email) {
        const existing = findParticipantByPrimaryEmail(email.toLowerCase());
        if (existing) {
          errors.push(`Linha ${i + 2}: E-mail ${email} já está inscrito.`);
          continue;
        }
      }

      // Insert participant
      insertParticipant(participantData);
      imported++;
    } catch (error) {
      errors.push(`Linha ${i + 2}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  return { imported, errors };
};

// Simple CSV row parser that handles quoted fields
const parseCSVRow = (row: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};
