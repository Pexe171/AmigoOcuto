// Este ficheiro deve estar em server/src/services/emailService.ts
import { mailer } from '../config/mailer';
import { GiftItem } from '../database/giftListRepository';

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

const capitalise = (value: string): string => {
  if (value.length === 0) {
    return value;
  }
  return value[0]!.toUpperCase() + value.slice(1);
};

const formatDateTimeForEmail = (date: Date): { fullDate: string; time: string } => {
  const fullDate = capitalise(
    date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  );
  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return { fullDate, time };
};

const describeTimeUntil = (target: Date): string => {
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    const diffPast = now.getTime() - target.getTime();
    if (diffPast <= 60 * 60 * 1000) {
      return 'O grande dia está a acontecer agora – aproveite cada momento!';
    }
    return 'O grande dia já aconteceu. Esperamos que tenha sido inesquecível!';
  }

  const totalMinutes = Math.round(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  }
  if (minutes > 0 && days === 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  }

  if (parts.length === 0) {
    return 'Menos de um minuto para o grande encontro!';
  }

  const formatted = parts.reduce((acc, part, index) => {
    if (index === 0) {
      return part;
    }
    if (index === parts.length - 1) {
      return `${acc} e ${part}`;
    }
    return `${acc}, ${part}`;
  }, '');

  return `Faltam ${formatted} para o grande encontro.`;
};

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
      @keyframes email-timer-glow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.25); transform: scale(1); }
        50% { box-shadow: 0 0 28px 6px rgba(239, 68, 68, 0.22); transform: scale(1.04); }
      }
      @keyframes email-timer-hand {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
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
      .email-timer { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
      .email-timer-ring { position: relative; width: 82px; height: 82px; border-radius: 50%; background: conic-gradient(from 180deg at 50% 50%, rgba(248, 113, 113, 0.9), rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.9), rgba(248, 113, 113, 0.9)); display: flex; align-items: center; justify-content: center; animation: email-timer-glow 8s ease-in-out infinite; }
      .email-timer-ring::after { content: ''; position: absolute; inset: 12px; border-radius: 50%; background: #fff; box-shadow: inset 0 8px 18px rgba(15, 23, 42, 0.12); }
      .email-timer-hand { position: absolute; top: 14px; left: 50%; width: 3px; height: 28px; transform-origin: center 26px; background: linear-gradient(to bottom, #b91c1c, #ef4444); border-radius: 999px; animation: email-timer-hand 12s linear infinite; }
      .email-timer-info { flex: 1 1 200px; }
      .email-timer-info p { margin: 0 0 6px; font-size: 15px; line-height: 1.6; color: #1f2a1f; }
      .email-timer-info strong { color: #b91c1c; }
      .email-timer-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; padding: 6px 14px; background: rgba(248, 113, 113, 0.12); color: #991b1b; border-radius: 999px; margin-bottom: 10px; }
      .email-timer-countdown { margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: #365949; }
      @media (prefers-reduced-motion: reduce) {
        .email-snowflake { display: none !important; }
        .email-timer-ring { animation: none !important; }
        .email-timer-hand { display: none !important; }
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

// Função que envia o E-MAIL DO SORTEIO PARA CRIANÇAS (para os pais/responsáveis)
export const sendDrawEmailToGuardian = async (
  child: ParticipantEmailData,
  assigned: ParticipantEmailData,
  gifts: GiftItem[],
  eventInfo: { name: string; location: string | null; drawDateTime?: Date | null },
): Promise<void> => {
  const recipientEmails = resolveRecipients(child);
  if (recipientEmails.length === 0) {
    return;
  }

  const assignedId = assigned.id;
  const mainRecipient = resolveMainRecipient(child, recipientEmails);
  const greeting = mainRecipient
    ? `Olá responsável,`
    : 'Olá responsáveis,';

  const childFullName = [child.firstName, child.secondName]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(' ');

  const assignedFullName = [assigned.firstName, assigned.secondName]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(' ');

  const locationMessage = eventInfo.location
    ? `Local confirmado: <strong>${eventInfo.location}</strong>.`
    : 'Assim que o local estiver definido, avisaremos todos os participantes.';

  const scheduleHtml = eventInfo.drawDateTime
    ? (() => {
        const { fullDate, time } = formatDateTimeForEmail(eventInfo.drawDateTime);
        const countdownText = describeTimeUntil(eventInfo.drawDateTime);
        return `
          <div style="margin: 18px 0 0;">
            <div class="email-timer" role="group" aria-label="Data e hora do encontro">
              <div class="email-timer-ring" aria-hidden="true">
                <span class="email-timer-hand"></span>
              </div>
              <div class="email-timer-info">
                <span class="email-timer-badge">Agenda do encontro</span>
                <p>Data: <strong>${fullDate}</strong></p>
                <p>Hora: <strong>${time}</strong></p>
                <p class="email-timer-countdown">${countdownText}</p>
              </div>
            </div>
          </div>
        `;
      })()
    : '';

  const eventDetailsHtml = `
    <div style="margin: 24px 0; padding: 24px; border: 1px solid rgba(22, 101, 52, 0.45); background: linear-gradient(160deg, rgba(220, 252, 231, 0.95), rgba(134, 239, 172, 0.88)); border-radius: 18px; box-shadow: 0 18px 36px rgba(20, 83, 45, 0.18);">
      <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.08em;">
        Detalhes do encontro
      </p>
      <p style="${paragraphStyle} margin-bottom: 8px;">Evento: <strong>${eventInfo.name}</strong></p>
      ${scheduleHtml}
      <p style="${paragraphStyle} margin-bottom: 0;">${locationMessage}</p>
    </div>
  `;

  const giftItemsHtml =
    gifts.length === 0
      ? `<p style="${paragraphStyle}">A criança sorteada ainda não cadastrou preferências de presente. Você pode ajudar ${assigned.firstName} a escolher algo especial!</p>`
      : `
        <p style="${paragraphStyle}">Estas são as sugestões que ${assigned.firstName} registou:</p>
        <ul style="margin: 0 0 16px 20px; padding: 0; color: #1f2a1f;">
          ${gifts
            .map((gift) => {
              const priority = gift.priority ? ` (prioridade ${gift.priority})` : '';
              const notes = gift.description ?? gift.notes;
              const description = notes ? ` – ${notes}` : '';
              const link = gift.url
                ? ` – <a href="${gift.url}" style="color: #4f46e5; text-decoration: underline;">${gift.url}</a>`
                : '';
              return `<li style="margin-bottom: 10px; font-size: 16px; line-height: 1.5;"><strong>${gift.name}</strong>${priority}${description}${link}</li>`;
            })
            .join('')}
        </ul>
      `;

  const assignmentHighlightHtml = `
    <div style="margin: 24px 0; padding: 24px; border: 1px solid rgba(185, 28, 28, 0.35); background: linear-gradient(160deg, rgba(254, 202, 202, 0.95), rgba(252, 165, 165, 0.9)); border-radius: 18px; box-shadow: 0 18px 40px rgba(153, 27, 27, 0.22);">
      <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.08em;">
        Amigo oculto da sua criança
      </p>
      <p style="${paragraphStyle} margin-bottom: 8px; color: #7f1d1d;">
        ${childFullName} vai presentear <strong>${assignedFullName}</strong>.
      </p>
      <p style="${paragraphStyle} margin-bottom: 0; color: #7f1d1d;">
        ID para guardar: <strong>${assignedId}</strong>
      </p>
    </div>
  `;

  const content = `
    <p style="${paragraphStyle}">O sorteio do Amigo Oculto foi realizado com sucesso! Aqui estão os detalhes para ${childFullName}.</p>
    ${eventDetailsHtml}
    ${assignmentHighlightHtml}
    ${giftItemsHtml}
    <p style="${paragraphStyle}">Ajude sua criança a escolher um presente especial e guarde este e-mail para referência futura.</p>
  `;

  const preheaderLocation = eventInfo.location
    ? ` Encontro em ${eventInfo.location}.`
    : '';

  const html = renderEmailTemplate({
    title: 'Resultado do Sorteio - Amigo Oculto',
    preheader: `O sorteio do evento ${eventInfo.name} foi realizado.${preheaderLocation} Veja quem ${child.firstName} vai presentear.`,
    greeting,
    content,
  });

  await mailer.sendMail({
    to: recipientEmails,
    subject: `Resultado do Sorteio - ${child.firstName} no Amigo Oculto`,
    html,
  });
};

// Função que envia o E-MAIL DO SORTEIO PARA ADULTOS (para o próprio participante)
export const sendDrawEmailToParticipant = async (
  participant: ParticipantEmailData,
  assigned: ParticipantEmailData,
  gifts: GiftItem[],
  eventInfo: { name: string; location: string | null; drawDateTime?: Date | null },
): Promise<void> => {
  const recipientEmails = resolveRecipients(participant);
  if (recipientEmails.length === 0) {
    return;
  }

  const assignedId = assigned.id;
  const mainRecipient = resolveMainRecipient(participant, recipientEmails);
  const greeting = mainRecipient
    ? `Olá ${participant.firstName},`
    : 'Olá,';

  const assignedFullName = [assigned.firstName, assigned.secondName]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(' ');

  const locationMessage = eventInfo.location
    ? `Local confirmado: <strong>${eventInfo.location}</strong>.`
    : 'Assim que o local estiver definido, avisaremos todos os participantes.';

  const scheduleHtml = eventInfo.drawDateTime
    ? (() => {
        const { fullDate, time } = formatDateTimeForEmail(eventInfo.drawDateTime);
        const countdownText = describeTimeUntil(eventInfo.drawDateTime);
        return `
          <div style="margin: 18px 0 0;">
            <div class="email-timer" role="group" aria-label="Data e hora do encontro">
              <div class="email-timer-ring" aria-hidden="true">
                <span class="email-timer-hand"></span>
              </div>
              <div class="email-timer-info">
                <span class="email-timer-badge">Agenda do encontro</span>
                <p>Data: <strong>${fullDate}</strong></p>
                <p>Hora: <strong>${time}</strong></p>
                <p class="email-timer-countdown">${countdownText}</p>
              </div>
            </div>
          </div>
        `;
      })()
    : '';

  const eventDetailsHtml = `
    <div style="margin: 24px 0; padding: 24px; border: 1px solid rgba(22, 101, 52, 0.45); background: linear-gradient(160deg, rgba(220, 252, 231, 0.95), rgba(134, 239, 172, 0.88)); border-radius: 18px; box-shadow: 0 18px 36px rgba(20, 83, 45, 0.18);">
      <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.08em;">
        Detalhes do encontro
      </p>
      <p style="${paragraphStyle} margin-bottom: 8px;">Evento: <strong>${eventInfo.name}</strong></p>
      ${scheduleHtml}
      <p style="${paragraphStyle} margin-bottom: 0;">${locationMessage}</p>
    </div>
  `;

  const giftItemsHtml =
    gifts.length === 0
      ? `<p style="${paragraphStyle}">O participante sorteado ainda não cadastrou preferências de presente. Que tal surpreender com algo especial?</p>`
      : `
        <p style="${paragraphStyle}">Estas são as sugestões que ele ou ela registou:</p>
        <ul style="margin: 0 0 16px 20px; padding: 0; color: #1f2a1f;">
          ${gifts
            .map((gift) => {
              const priority = gift.priority ? ` (prioridade ${gift.priority})` : '';
              const notes = gift.description ?? gift.notes;
              const description = notes ? ` – ${notes}` : '';
              const link = gift.url
                ? ` – <a href="${gift.url}" style="color: #4f46e5; text-decoration: underline;">${gift.url}</a>`
                : '';
              return `<li style="margin-bottom: 10px; font-size: 16px; line-height: 1.5;"><strong>${gift.name}</strong>${priority}${description}${link}</li>`;
            })
            .join('')}
        </ul>
      `;

  const assignmentHighlightHtml = `
    <div style="margin: 24px 0; padding: 24px; border: 1px solid rgba(185, 28, 28, 0.35); background: linear-gradient(160deg, rgba(254, 202, 202, 0.95), rgba(252, 165, 165, 0.9)); border-radius: 18px; box-shadow: 0 18px 40px rgba(153, 27, 27, 0.22);">
      <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.08em;">
        Seu amigo oculto
      </p>
      <p style="${paragraphStyle} margin-bottom: 8px; color: #7f1d1d;">
        Você vai presentear <strong>${assignedFullName}</strong>.
      </p>
      <p style="${paragraphStyle} margin-bottom: 0; color: #7f1d1d;">
        ID para guardar: <strong>${assignedId}</strong>
      </p>
    </div>
  `;

  const content = `
    <p style="${paragraphStyle}">O sorteio do Amigo Oculto foi realizado com sucesso! Aqui estão os detalhes do seu amigo oculto.</p>
    ${eventDetailsHtml}
    ${assignmentHighlightHtml}
    ${giftItemsHtml}
    <p style="${paragraphStyle}">Prepare um presente especial e guarde este e-mail para referência futura.</p>
  `;

  const preheaderLocation = eventInfo.location
    ? ` Encontro em ${eventInfo.location}.`
    : '';

  const html = renderEmailTemplate({
    title: 'Seu Sorteio do Amigo Oculto',
    preheader: `O sorteio do evento ${eventInfo.name} foi realizado.${preheaderLocation} Descubra quem você vai presentear.`,
    greeting,
    content,
  });

  await mailer.sendMail({
    to: recipientEmails,
    subject: 'Seu Sorteio do Amigo Oculto',
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

export const sendDrawReminderEmail = async (
  moderatorEmail: string,
  eventName: string,
  eventId: string,
  drawDateTime: Date,
): Promise<void> => {
  const content = `
    <p style="${paragraphStyle}">Este é um lembrete automático para o sorteio do evento <strong>${eventName}</strong>.</p>
    <div style="margin: 24px 0; padding: 24px; border-radius: 18px; background: linear-gradient(160deg, rgba(254, 249, 195, 0.95), rgba(254, 240, 138, 0.9)); border: 1px solid rgba(217, 119, 6, 0.3); box-shadow: 0 18px 36px rgba(146, 64, 14, 0.18);">
      <p style="${paragraphStyle} margin-bottom: 12px;">O sorteio está agendado para: <strong>${drawDateTime.toLocaleString('pt-BR')}</strong></p>
      <p style="${paragraphStyle} margin-bottom: 12px;">ID do evento: <strong>${eventId}</strong></p>
      <p style="${paragraphStyle} margin-bottom: 0;">Por favor, acesse o painel administrativo para realizar o sorteio.</p>
    </div>
    <p style="${paragraphStyle}">Este lembrete é enviado automaticamente quando a data do sorteio se aproxima.</p>
  `;

  const html = renderEmailTemplate({
    title: 'Lembrete de Sorteio - Amigo Ocuto',
    preheader: `Lembrete: Sorteio do evento ${eventName} está próximo.`,
    greeting: 'Olá Moderador,',
    content,
  });

  await mailer.sendMail({
    to: moderatorEmail,
    subject: `Lembrete: Sorteio de ${eventName}`,
    html,
  });
};
