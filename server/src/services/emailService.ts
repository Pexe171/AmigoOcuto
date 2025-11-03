import { mailer } from '../config/mailer';
import { ParticipantDocument } from '../models/Participant';
import { GiftItem } from '../models/GiftList';

const buildGuardianList = (participant: ParticipantDocument): string[] => {
  const guardians = new Set<string>();
  if (participant.primaryGuardianEmail) {
    guardians.add(participant.primaryGuardianEmail);
  }
  participant.guardianEmails.forEach((email) => guardians.add(email));
  return Array.from(guardians);
};

export const sendVerificationEmail = async (
  participant: ParticipantDocument,
  code: string
): Promise<void> => {
  const recipients = participant.isChild ? buildGuardianList(participant) : [participant.email!];
  const mainRecipient = participant.isChild
    ? participant.primaryGuardianEmail ?? recipients[0]
    : participant.email!;

  const html = `
    <p>Olá ${participant.firstName},</p>
    <p>Recebemos o seu pedido para participar do Amigo Ocuto.</p>
    <p>Use o código <strong>${code}</strong> para validar o e-mail principal (${mainRecipient}).</p>
    <p>Este código expira em 30 minutos.</p>
  `;

  await mailer.sendMail({
    to: recipients,
    subject: 'Confirme a sua inscrição no Amigo Ocuto',
    html
  });
};

export const sendDrawEmail = async (
  participant: ParticipantDocument,
  assigned: ParticipantDocument,
  ticketCode: string,
  gifts: GiftItem[]
): Promise<void> => {
  const recipientEmails = participant.isChild
    ? buildGuardianList(participant)
    : [participant.email!];

  const giftHtml =
    gifts.length === 0
      ? '<p>O participante sorteado ainda não cadastrou preferências de presente.</p>'
      : `<ul>${gifts
          .map(
            (gift) =>
              `<li><strong>${gift.name}</strong>${gift.priority ? ` (prioridade ${gift.priority})` : ''}${
                gift.description ? ` - ${gift.description}` : ''
              }${gift.url ? ` - <a href="${gift.url}">${gift.url}</a>` : ''}</li>`
          )
          .join('')}</ul>`;

  const html = `
    <p>Olá ${participant.firstName},</p>
    <p>O sorteio do Amigo Ocuto foi realizado e o seu ticket é <strong>${ticketCode}</strong>.</p>
    <p>Você presenteia: <strong>${assigned.firstName} ${assigned.secondName}</strong>.</p>
    ${giftHtml}
    <p>Guarde este e-mail, ele será útil para futuras consultas.</p>
  `;

  await mailer.sendMail({
    to: recipientEmails,
    subject: 'Seu sorteio do Amigo Ocuto',
    html
  });
};
