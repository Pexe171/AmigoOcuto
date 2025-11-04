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

// Função auxiliar para encontrar todos os e-mails de um participante (incluindo responsáveis)
const buildGuardianList = (participant: ParticipantContact): string[] => {
  const guardians = new Set<string>();
  if (participant.primaryGuardianEmail) {
    guardians.add(participant.primaryGuardianEmail);
  }
  participant.guardianEmails.forEach((email) => guardians.add(email));
  return Array.from(guardians);
};

// Função que envia o E-MAIL DE VERIFICAÇÃO
export const sendVerificationEmail = async (
  participant: ParticipantContact,
  code: string,
): Promise<void> => {
  // Decide para quem enviar: para o próprio adulto, ou para os responsáveis se for criança
  const recipients = participant.isChild
    ? buildGuardianList(participant)
    : participant.email
      ? [participant.email]
      : buildGuardianList(participant);
  const mainRecipient = participant.isChild
    ? participant.primaryGuardianEmail ?? recipients[0]
    : participant.email ?? recipients[0];

  // O HTML do e-mail
  const html = `
    <p>Olá ${participant.firstName},</p>
    <p>Recebemos o seu pedido para participar do Amigo Ocuto.</p>
    <p>Use o código <strong>${code}</strong> para validar o e-mail principal (${mainRecipient}).</p>
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
  const recipientEmails = participant.isChild
    ? buildGuardianList(participant)
    : [participant.email!];

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
    <p>O sorteio do Amigo Ocuto foi realizado e o seu ticket é <strong>${ticketCode}</strong>.</p>
    <p>Você presenteia: <strong>${assigned.firstName} ${
      assigned.secondName
    }</strong>.</p>
    ${giftHtml}
    <p>Guarde este e-mail, ele será útil para futuras consultas.</p>
  `;

  // Chama o 'mailer'
  await mailer.sendMail({
    to: recipientEmails,
    subject: 'Seu sorteio do Amigo Ocuto',
    html,
  });
};
