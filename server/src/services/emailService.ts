// Este ficheiro deve estar em server/src/services/emailService.ts
import { mailer } from '../config/mailer';
import { ParticipantDocument } from '../models/Participant';
import { GiftItem } from '../models/GiftList';

export type ParticipantContact = {
  firstName: string;
  isChild: boolean;
  email?: string;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
};

type ParticipantEmailTarget = Pick<ParticipantContact, 'isChild' | 'email' | 'primaryGuardianEmail' | 'guardianEmails'>;

const buildGuardianList = (primary?: string | null, extras: string[] = []): string[] => {
  const guardians = new Set<string>();
  if (primary) {
    guardians.add(primary);
  }
  extras.forEach((email) => {
    if (email) {
      guardians.add(email);
    }
  });
  return Array.from(guardians);
};

const resolveRecipients = (participant: ParticipantEmailTarget): string[] => {
  const guardianList = buildGuardianList(participant.primaryGuardianEmail, participant.guardianEmails ?? []);
  if (participant.isChild) {
    return guardianList;
  }
  if (participant.email) {
    return [participant.email];
  }
  return guardianList;
};

const resolveMainRecipient = (
  participant: ParticipantEmailTarget,
  recipients: string[],
): string | null => {
  if (participant.isChild) {
    return participant.primaryGuardianEmail ?? recipients[0] ?? null;
  }
  if (participant.email) {
    return participant.email;
  }
  return recipients[0] ?? null;
};

export const collectParticipantRecipients = (participant: ParticipantEmailTarget): string[] =>
  resolveRecipients(participant);

// Função que envia o E-MAIL DE VERIFICAÇÃO
export const sendVerificationEmail = async (
  participant: ParticipantContact,
  code: string,
): Promise<void> => {
  const recipients = resolveRecipients(participant);
  if (recipients.length === 0) {
    throw new Error('Nenhum e-mail válido foi informado para o envio do código de verificação.');
  }
  const mainRecipient = resolveMainRecipient(participant, recipients);
  const recipientLabel = mainRecipient ?? 'o endereço principal informado na inscrição';

  // O HTML do e-mail
  const html = `
    <p>Olá ${participant.firstName},</p>
    <p>Recebemos o seu pedido para participar do Amigo Ocuto.</p>
    <p>Use o código <strong>${code}</strong> para validar o e-mail principal (${recipientLabel}).</p>
    <p>Este código expira em 30 minutos.</p>
  `;

  // Chama o 'mailer' que configurámos no ficheiro anterior
  await mailer.sendMail({
    to: recipients,
    subject: 'Confirme a sua inscrição no Amigo Ocuto',
    html,
  });
};

// Função que envia o E-MAIL DO SORTEIO
export const sendDrawEmail = async (
  participant: ParticipantDocument,
  assigned: ParticipantDocument,
  ticketCode: string,
  gifts: GiftItem[],
): Promise<void> => {
  const recipientEmails = resolveRecipients(participant);
  if (recipientEmails.length === 0) {
    return;
  }

  const assignedId = assigned.id;
  const mainRecipient = resolveMainRecipient(participant, recipientEmails);
  const greeting = mainRecipient
    ? `Estamos escrevendo para ${mainRecipient}.`
    : 'Estamos escrevendo para os contatos cadastrados.';

  // Gera a lista de presentes em HTML
  const giftHtml =
    gifts.length === 0
      ? '<p>O participante sorteado ainda não cadastrou preferências de presente.</p>'
      : `<ul>${gifts
          .map(
            (gift) =>
              `<li><strong>${gift.name}</strong>${
                gift.priority ? ` (prioridade ${gift.priority})` : ''
              }${gift.description ? ` - ${gift.description}` : ''}${
                gift.url ? ` - <a href="${gift.url}">${gift.url}</a>` : ''
              }</li>`,
          )
          .join('')}</ul>`;

  // O HTML do e-mail do sorteio
  const html = `
    <p>Olá ${participant.firstName},</p>
    <p>${greeting}</p>
    <p>O sorteio do Amigo Ocuto foi realizado e o seu ticket é <strong>${ticketCode}</strong>.</p>
    <p>Você presenteia: <strong>${assigned.firstName} ${assigned.secondName}</strong>.</p>
    <p>ID do seu amigo oculto: <strong>${assignedId}</strong>.</p>
    ${giftHtml}
    <p>Guarde este e-mail. Use o ticket <strong>${ticketCode}</strong> ou o ID acima para consultar a qualquer momento a lista de presentes no portal.</p>
  `;

  // Chama o 'mailer'
  await mailer.sendMail({
    to: recipientEmails,
    subject: 'Seu sorteio do Amigo Ocuto',
    html,
  });
};

export const sendTestEmailToParticipant = async (
  participant: ParticipantDocument,
  recipients: string[],
): Promise<void> => {
  if (recipients.length === 0) {
    return;
  }

  const html = `
    <p>Olá ${participant.firstName},</p>
    <p>Este é um disparo de teste realizado pelo painel administrativo do Amigo Ocuto.</p>
    <p>Estamos verificando a entrega para os seguintes e-mails:</p>
    <ul>
      ${recipients.map((email) => `<li>${email}</li>`).join('')}
    </ul>
    <p>Se você recebeu esta mensagem, está tudo certo para o sorteio oficial.</p>
  `;

  await mailer.sendMail({
    to: recipients,
    subject: 'Teste de disparo - Amigo Ocuto',
    html,
  });
};
