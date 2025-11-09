// Este ficheiro deve estar em server/src/services/emailService.ts
import { mailer } from '../config/mailer';
import { GiftItem } from '../models/GiftList';

const paragraphStyle = 'margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1f2937;';
const subtleTextStyle = 'margin: 0; font-size: 14px; line-height: 1.5; color: #6b7280;';

type EmailTemplateOptions = {
  title: string;
  preheader?: string;
  greeting?: string;
  content: string;
  footerNotes?: string[];
};

const defaultFooterNotes = [
  'Se tiver alguma dúvida, basta responder a este e-mail e iremos ajudar.',
  'Abraços da equipa do Amigo Ocuto.',
];

const renderEmailTemplate = ({
  title,
  preheader,
  greeting,
  content,
  footerNotes,
}: EmailTemplateOptions): string => {
  const footer = footerNotes ?? defaultFooterNotes;
  const footerHtml = footer
    .map(
      (note) =>
        `<p style="${subtleTextStyle} margin-top: 8px;">${note}</p>`,
    )
    .join('');
  const greetingHtml = greeting ? `<p style="${paragraphStyle}">${greeting}</p>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, sans-serif;">
    <span style="display: none; color: transparent; height: 0; width: 0; opacity: 0; overflow: hidden;">${
      preheader ?? ''
    }</span>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; padding: 24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);">
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px 32px; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Amigo Ocuto</h1>
                <p style="${subtleTextStyle} color: rgba(255,255,255,0.86); margin-top: 8px;">Sistema de sorteio e gestão de presentes</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 32px 16px 32px;">
                <h2 style="margin: 0 0 24px; font-size: 22px; color: #111827;">${title}</h2>
                ${greetingHtml}
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 32px 32px;">
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px;" />
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export type ParticipantContact = {
  firstName: string;
  isChild: boolean;
  email?: string;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
};

type ParticipantEmailTarget = {
  isChild: boolean;
  email?: string | null;
  primaryGuardianEmail?: string | null;
  guardianEmails?: string[] | null;
};

export type ParticipantEmailData = ParticipantEmailTarget & {
  id?: string;
  firstName: string;
  secondName?: string | null;
};

export const buildGuardianList = (primary?: string | null, extras: string[] = []): string[] => {
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
type VerificationEmailPurpose = 'registration' | 'resend' | 'login' | 'update-email';

type VerificationEmailCopy = {
  subject: string;
  intro: string;
  action: (code: string, recipientLabel: string) => string;
  footer?: string;
};

const verificationEmailCopy: Record<VerificationEmailPurpose, VerificationEmailCopy> = {
  registration: {
    subject: 'Confirme a sua inscrição no Amigo Ocuto',
    intro: 'Recebemos o seu pedido para participar do Amigo Ocuto.',
    action: (code, recipientLabel) =>
      `Use o código <strong>${code}</strong> para validar o e-mail principal (${recipientLabel}).`,
    footer: 'Este código expira em 30 minutos. Caso não tenha solicitado, ignore esta mensagem.',
  },
  resend: {
    subject: 'Aqui está o novo código para confirmar sua participação',
    intro: 'Conforme solicitado, reenviamos o código de verificação da sua inscrição.',
    action: (code, recipientLabel) =>
      `Digite <strong>${code}</strong> na página de confirmação para validar o endereço ${recipientLabel}.`,
    footer: 'O código anterior foi substituído e este expira em 30 minutos.',
  },
  login: {
    subject: 'Seu código de acesso à lista de presentes',
    intro:
      'Recebemos o pedido para acessar a página "Minha lista de presentes". Protegemos esse espaço com verificação em duas etapas.',
    action: (code, recipientLabel) =>
      `Use <strong>${code}</strong> para entrar. O código foi enviado para ${recipientLabel}.`,
    footer: 'Se você não solicitou este acesso, pode ignorar o e-mail com segurança.',
  },
  'update-email': {
    subject: 'Confirme o novo e-mail informado no Amigo Ocuto',
    intro: 'Recebemos a solicitação para alterar o e-mail principal da inscrição.',
    action: (code, recipientLabel) =>
      `Digite <strong>${code}</strong> para confirmar o novo endereço (${recipientLabel}) e manter a conta protegida.`,
    footer: 'Por segurança, o código expira em 30 minutos.',
  },
};

export const sendVerificationEmail = async (
  participant: ParticipantContact,
  code: string,
  purpose: VerificationEmailPurpose = 'registration',
): Promise<void> => {
  const recipients = resolveRecipients(participant);
  if (recipients.length === 0) {
    throw new Error('Nenhum e-mail válido foi informado para o envio do código de verificação.');
  }

  const mainRecipient = resolveMainRecipient(participant, recipients);
  const recipientLabel = mainRecipient ?? 'o endereço principal informado na inscrição';
  const copy = verificationEmailCopy[purpose];

  const actionMessage = copy.action(code, recipientLabel);
  const content = `
    <p style="${paragraphStyle}">${copy.intro}</p>
    <div style="margin: 24px 0; padding: 24px; background-color: #eef2ff; border-radius: 16px; text-align: center;">
      <p style="margin: 0 0 12px; font-size: 15px; color: #4338ca; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">
        Código de confirmação
      </p>
      <p style="margin: 0 0 16px; font-size: 32px; font-weight: 700; color: #312e81; letter-spacing: 0.12em;">${code}</p>
      <p style="${paragraphStyle} margin-bottom: 0; color: #312e81;">${actionMessage}</p>
    </div>
    ${copy.footer ? `<p style="${paragraphStyle}">${copy.footer}</p>` : ''}
  `;

  const html = renderEmailTemplate({
    title: copy.subject,
    preheader: `${copy.intro} ${actionMessage}`,
    greeting: `Olá ${participant.firstName},`,
    content,
  });

  await mailer.sendMail({
    to: recipients,
    subject: copy.subject,
    html,
  });
};

// Função que envia o E-MAIL DO SORTEIO
export const sendDrawEmail = async (
  participant: ParticipantEmailData,
  assigned: ParticipantEmailData,
  ticketCode: string,
  gifts: GiftItem[],
  eventInfo: { name: string; location: string | null },
): Promise<void> => {
  const recipientEmails = resolveRecipients(participant);
  if (recipientEmails.length === 0) {
    return;
  }

  const assignedId = assigned.id;
  const mainRecipient = resolveMainRecipient(participant, recipientEmails);
  const greeting = mainRecipient
    ? `Estamos escrevendo para ${mainRecipient}.`
    : 'Estamos escrevendo para os contactos cadastrados.';

  const assignedFullName = [assigned.firstName, assigned.secondName]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(' ');

  const locationMessage = eventInfo.location
    ? `Local confirmado: <strong>${eventInfo.location}</strong>.`
    : 'Assim que o local estiver definido, avisaremos todos os participantes.';

  const eventDetailsHtml = `
    <div style="margin: 24px 0; padding: 24px; border: 1px solid #fcd34d; background-color: #fffbeb; border-radius: 16px;">
      <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.08em;">
        Detalhes do encontro
      </p>
      <p style="${paragraphStyle} margin-bottom: 8px;">Evento: <strong>${eventInfo.name}</strong></p>
      <p style="${paragraphStyle} margin-bottom: 0;">${locationMessage}</p>
    </div>
  `;

  const giftItemsHtml =
    gifts.length === 0
      ? `<p style="${paragraphStyle}">O participante sorteado ainda não cadastrou preferências de presente.</p>`
      : `
        <p style="${paragraphStyle}">Estas são as sugestões que ele ou ela registou:</p>
        <ul style="margin: 0 0 16px 20px; padding: 0; color: #1f2937;">
          ${gifts
            .map((gift) => {
              const priority = gift.priority ? ` (prioridade ${gift.priority})` : '';
              const description = gift.description ? ` – ${gift.description}` : '';
              const link = gift.url
                ? ` – <a href="${gift.url}" style="color: #4f46e5; text-decoration: underline;">${gift.url}</a>`
                : '';
              return `<li style="margin-bottom: 10px; font-size: 16px; line-height: 1.5;"><strong>${gift.name}</strong>${priority}${description}${link}</li>`;
            })
            .join('')}
        </ul>
      `;

  const content = `
    <p style="${paragraphStyle}">${greeting}</p>
    ${eventDetailsHtml}
    <div style="margin: 24px 0; padding: 24px; border: 1px solid #e0e7ff; background-color: #eef2ff; border-radius: 16px;">
      <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #4338ca; text-transform: uppercase; letter-spacing: 0.08em;">
        Ticket do sorteio
      </p>
      <p style="margin: 0 0 16px; font-size: 28px; font-weight: 700; color: #312e81; letter-spacing: 0.08em;">${ticketCode}</p>
      <p style="${paragraphStyle} margin-bottom: 0;">Guarde este código. Ele dá acesso rápido à lista do seu amigo oculto.</p>
    </div>
    <p style="${paragraphStyle}">Você presenteia <strong>${assignedFullName}</strong>.</p>
    <p style="${paragraphStyle}">ID do seu amigo oculto: <strong>${assignedId}</strong>.</p>
    ${giftItemsHtml}
    <p style="${paragraphStyle}">Sempre que precisar, utilize o ticket <strong>${ticketCode}</strong> ou o ID indicado para rever as informações no portal.</p>
  `;

  const preheaderLocation = eventInfo.location
    ? ` Encontro em ${eventInfo.location}.`
    : '';

  const html = renderEmailTemplate({
    title: 'Seu sorteio do Amigo Ocuto',
    preheader: `O sorteio do evento ${eventInfo.name} foi realizado.${preheaderLocation} Guarde o ticket ${ticketCode}.`,
    greeting: `Olá ${participant.firstName},`,
    content,
  });

  await mailer.sendMail({
    to: recipientEmails,
    subject: 'Seu sorteio do Amigo Ocuto',
    html,
  });
};

export const sendDrawCancellationEmail = async (
  participant: ParticipantEmailData,
): Promise<void> => {
  const recipientEmails = resolveRecipients(participant);
  if (recipientEmails.length === 0) {
    return;
  }

  const mainRecipient = resolveMainRecipient(participant, recipientEmails);
  const greeting = mainRecipient
    ? `Estamos escrevendo para ${mainRecipient}.`
    : 'Estamos escrevendo para os contactos cadastrados.';

  const content = `
    <p style="${paragraphStyle}">${greeting}</p>
    <p style="${paragraphStyle}">O sorteio do Amigo Ocuto foi cancelado devido a um erro administrativo.</p>
    <p style="${paragraphStyle}">Pode desconsiderar qualquer e-mail anterior sobre o sorteio. Assim que tivermos uma nova data, entraremos em contacto com todos os participantes.</p>
    <p style="${paragraphStyle}">Pedimos desculpa pelo inconveniente e agradecemos a compreensão.</p>
  `;

  const html = renderEmailTemplate({
    title: 'Cancelamento do sorteio do Amigo Ocuto',
    preheader: 'Tivemos um problema administrativo e o sorteio será reagendado.',
    greeting: `Olá ${participant.firstName},`,
    content,
  });

  await mailer.sendMail({
    to: recipientEmails,
    subject: 'Cancelamento do sorteio do Amigo Ocuto',
    html,
  });
};

export const sendTestEmailToParticipant = async (
  participant: ParticipantEmailData,
  recipients: string[],
): Promise<void> => {
  if (recipients.length === 0) {
    return;
  }

  const content = `
    <p style="${paragraphStyle}">Este é um disparo de teste realizado pelo painel administrativo do Amigo Ocuto.</p>
    <p style="${paragraphStyle}">Estamos a confirmar que todos estes endereços estão a receber corretamente:</p>
    <ul style="margin: 0 0 16px 20px; padding: 0; color: #1f2937;">
      ${recipients
        .map((email) => `<li style='margin-bottom: 8px; font-size: 16px; line-height: 1.5;'>${email}</li>`)
        .join('')}
    </ul>
    <p style="${paragraphStyle}">Se esta mensagem chegou até si, estamos prontos para avançar com o sorteio oficial.</p>
  `;

  const html = renderEmailTemplate({
    title: 'Teste de disparo - Amigo Ocuto',
    preheader: 'Confirmação de entrega dos e-mails antes do sorteio.',
    greeting: `Olá ${participant.firstName},`,
    content,
  });

  await mailer.sendMail({
    to: recipients,
    subject: 'Teste de disparo - Amigo Ocuto',
    html,
  });
};
