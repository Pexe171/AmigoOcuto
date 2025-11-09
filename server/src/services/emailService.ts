// Este ficheiro deve estar em server/src/services/emailService.ts
import { mailer } from '../config/mailer';
import { GiftItem } from '../models/GiftList';

const paragraphStyle = 'margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1f2a1f;';
const subtleTextStyle = 'margin: 0; font-size: 14px; line-height: 1.5; color: #365949;';

const SNOWFLAKE_STYLES = [
  { left: '4%', delay: '0s', duration: '14s', size: '18px', opacity: '0.55' },
  { left: '14%', delay: '1.2s', duration: '12s', size: '12px', opacity: '0.45' },
  { left: '24%', delay: '2.4s', duration: '11s', size: '16px', opacity: '0.5' },
  { left: '34%', delay: '0.6s', duration: '13s', size: '20px', opacity: '0.6' },
  { left: '44%', delay: '3.2s', duration: '10s', size: '14px', opacity: '0.4' },
  { left: '54%', delay: '1.8s', duration: '15s', size: '22px', opacity: '0.65' },
  { left: '64%', delay: '0.9s', duration: '12s', size: '16px', opacity: '0.48' },
  { left: '74%', delay: '2.7s', duration: '13s', size: '18px', opacity: '0.52' },
  { left: '84%', delay: '1.4s', duration: '11s', size: '14px', opacity: '0.42' },
  { left: '94%', delay: '3.6s', duration: '15s', size: '20px', opacity: '0.58' },
  { left: '10%', delay: '4.2s', duration: '16s', size: '22px', opacity: '0.6' },
  { left: '70%', delay: '4.8s', duration: '14s', size: '24px', opacity: '0.62' },
];

const renderSnowOverlay = (): string =>
  SNOWFLAKE_STYLES.map(
    (flake) =>
      `<span class="email-snowflake" aria-hidden="true" style="left: ${flake.left}; animation-delay: ${flake.delay}; animation-duration: ${flake.duration}; font-size: ${flake.size}; opacity: ${flake.opacity};">❄</span>`,
  ).join('');

type EmailTemplateOptions = {
  title: string;
  preheader?: string;
  greeting?: string;
  content: string;
  footerNotes?: string[];
};

const defaultFooterNotes = ['Que o seu Natal seja cheio de bons encontros e presentes com significado.'];

const renderEmailTemplate = ({
  title,
  preheader,
  greeting,
  content,
  footerNotes,
}: EmailTemplateOptions): string => {
  const footer = footerNotes ?? defaultFooterNotes;
  const footerHtml = footer
    .map((note) => `<p style="${subtleTextStyle} margin-top: 8px;">${note}</p>`)
    .join('');
  const greetingHtml = greeting ? `<p style="${paragraphStyle}">${greeting}</p>` : '';
  const snowOverlay = renderSnowOverlay();

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      @keyframes email-snowfall {
        0% { transform: translate3d(-10px, -15%, 0); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translate3d(20px, 110%, 0); opacity: 0; }
      }
      .email-card { position: relative; border-radius: 28px; overflow: hidden; background: rgba(255, 255, 255, 0.94); box-shadow: 0 24px 48px rgba(15, 23, 42, 0.25); }
      .email-snow-scene { position: relative; }
      .email-snow-scene::before { content: ''; position: absolute; inset: 0; background: linear-gradient(160deg, rgba(220, 38, 38, 0.92), rgba(22, 101, 52, 0.95)); }
      .email-snow-scene::after { content: ''; position: absolute; inset: 0; background: url('https://assets.codepen.io/1462889/snow-dots.png') repeat; opacity: 0.06; mix-blend-mode: screen; }
      .email-snow-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
      .email-snowflake { position: absolute; top: -12%; color: #ffffff; text-shadow: 0 0 6px rgba(255, 255, 255, 0.6); animation: email-snowfall linear infinite; }
      .email-card-content { position: relative; padding: 0; }
      .email-card-header { padding: 32px 32px 24px; text-align: center; color: #fff; position: relative; z-index: 2; }
      .email-card-header h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
      .email-card-header p { margin: 8px 0 0; font-size: 16px; opacity: 0.85; }
      .email-card-body { padding: 32px; background: rgba(255, 255, 255, 0.94); position: relative; z-index: 2; }
      .email-card-footer { padding: 0 32px 32px; background: rgba(255, 255, 255, 0.94); position: relative; z-index: 2; }
      @media (prefers-reduced-motion: reduce) {
        .email-snowflake { display: none !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, sans-serif;">
    <span style="display: none; color: transparent; height: 0; width: 0; opacity: 0; overflow: hidden;">${
      preheader ?? ''
    }</span>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: radial-gradient(circle at top, #f9fafb 0%, #dcfce7 40%, #134e4a 120%); padding: 32px 0;">
      <tr>
        <td align="center">
          <div style="max-width: 640px; width: 100%; padding: 0 16px;">
            <div class="email-card">
              <div class="email-snow-scene">
                <div class="email-snow-layer" aria-hidden="true">${snowOverlay}</div>
                <div class="email-card-content">
                  <div class="email-card-header">
                    <h1>Amigo Ocuto</h1>
                    <p>Fazendo o Natal de ${new Date().getFullYear()} ainda mais especial</p>
                  </div>
                  <div class="email-card-body">
                    <h2 style="margin: 0 0 24px; font-size: 24px; color: #b91c1c;">${title}</h2>
                    ${greetingHtml}
                    ${content}
                  </div>
                  <div class="email-card-footer">
                    <hr style="border: none; border-top: 1px solid rgba(220, 38, 38, 0.2); margin: 0 0 16px;" />
                    ${footerHtml}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
    <div style="margin: 24px 0; padding: 24px; background: linear-gradient(145deg, #fef3c7, #fde68a); border-radius: 18px; text-align: center; border: 1px solid rgba(217, 119, 6, 0.35); box-shadow: 0 18px 40px rgba(146, 64, 14, 0.18);">
      <p style="margin: 0 0 12px; font-size: 15px; color: #b45309; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">
        Código de confirmação
      </p>
      <p style="margin: 0 0 16px; font-size: 34px; font-weight: 700; color: #991b1b; letter-spacing: 0.12em;">${code}</p>
      <p style="${paragraphStyle} margin-bottom: 0; color: #78350f;">${actionMessage}</p>
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
    <div style="margin: 24px 0; padding: 24px; border: 1px solid rgba(22, 101, 52, 0.45); background: linear-gradient(160deg, rgba(220, 252, 231, 0.95), rgba(134, 239, 172, 0.88)); border-radius: 18px; box-shadow: 0 18px 36px rgba(20, 83, 45, 0.18);">
      <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.08em;">
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
        <ul style="margin: 0 0 16px 20px; padding: 0; color: #1f2a1f;">
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
    <div style="margin: 24px 0; padding: 24px; border: 1px solid rgba(185, 28, 28, 0.35); background: linear-gradient(160deg, rgba(254, 202, 202, 0.95), rgba(252, 165, 165, 0.9)); border-radius: 18px; box-shadow: 0 18px 40px rgba(153, 27, 27, 0.22);">
      <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.08em;">
        Ticket do sorteio
      </p>
      <p style="margin: 0 0 16px; font-size: 28px; font-weight: 700; color: #7f1d1d; letter-spacing: 0.08em;">${ticketCode}</p>
      <p style="${paragraphStyle} margin-bottom: 0; color: #7f1d1d;">Guarde este código. Ele dá acesso rápido à lista do seu amigo oculto.</p>
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
    <div style="margin: 24px 0; padding: 24px; border-radius: 18px; background: linear-gradient(160deg, rgba(254, 226, 226, 0.95), rgba(254, 249, 195, 0.88)); border: 1px solid rgba(220, 38, 38, 0.25); box-shadow: 0 18px 36px rgba(127, 29, 29, 0.18);">
      <p style="${paragraphStyle} margin-bottom: 12px;">O sorteio do Amigo Ocuto foi cancelado devido a um erro administrativo.</p>
      <p style="${paragraphStyle} margin-bottom: 12px;">Pode desconsiderar qualquer e-mail anterior sobre o sorteio. Assim que tivermos uma nova data, entraremos em contacto com todos os participantes.</p>
      <p style="${paragraphStyle} margin-bottom: 0;">Estamos a trabalhar para reagendar tudo rapidamente e manter o espírito natalino em dia.</p>
    </div>
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
    <div style="margin: 24px 0; padding: 24px; border-radius: 18px; background: linear-gradient(160deg, rgba(220, 252, 231, 0.95), rgba(187, 247, 208, 0.9)); border: 1px solid rgba(22, 101, 52, 0.3); box-shadow: 0 18px 36px rgba(22, 101, 52, 0.18);">
      <p style="${paragraphStyle} margin-bottom: 12px;">Estamos a confirmar que todos estes endereços estão a receber corretamente:</p>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #1f2a1f;">
        ${recipients
          .map((email) => `<li style='margin-bottom: 8px; font-size: 16px; line-height: 1.5;'>${email}</li>`)
          .join('')}
      </ul>
    </div>
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
