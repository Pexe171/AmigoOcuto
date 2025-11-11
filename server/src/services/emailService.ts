// Este ficheiro deve estar em server/src/services/emailService.ts
import { mailer } from '../config/mailer';
import { GiftItem } from '../database/giftListRepository';

const paragraphStyle =
  "margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #052e2b; font-family: 'Merriweather', Georgia, serif;";
const subtleTextStyle =
  "margin: 0; font-size: 14px; line-height: 1.55; color: #075e54; font-family: 'Merriweather', Georgia, serif;";

const SNOWFLAKE_STYLES = [
  { left: '4%', top: '10%', size: '18px', opacity: '0.55' },
  { left: '14%', top: '25%', size: '12px', opacity: '0.45' },
  { left: '24%', top: '15%', size: '16px', opacity: '0.5' },
  { left: '34%', top: '30%', size: '20px', opacity: '0.6' },
  { left: '44%', top: '20%', size: '14px', opacity: '0.4' },
  { left: '54%', top: '35%', size: '22px', opacity: '0.65' },
  { left: '64%', top: '12%', size: '16px', opacity: '0.48' },
  { left: '74%', top: '28%', size: '18px', opacity: '0.52' },
  { left: '84%', top: '18%', size: '14px', opacity: '0.42' },
  { left: '94%', top: '32%', size: '20px', opacity: '0.58' },
  { left: '10%', top: '22%', size: '22px', opacity: '0.6' },
  { left: '70%', top: '8%', size: '24px', opacity: '0.62' },
  { left: '6%', top: '40%', size: '16px', opacity: '0.5' },
  { left: '18%', top: '5%', size: '20px', opacity: '0.55' },
  { left: '28%', top: '38%', size: '18px', opacity: '0.45' },
  { left: '38%', top: '12%', size: '14px', opacity: '0.4' },
  { left: '48%', top: '26%', size: '22px', opacity: '0.6' },
  { left: '58%', top: '18%', size: '16px', opacity: '0.48' },
  { left: '68%', top: '35%', size: '20px', opacity: '0.52' },
  { left: '78%', top: '10%', size: '18px', opacity: '0.42' },
  { left: '88%', top: '28%', size: '24px', opacity: '0.58' },
  { left: '2%', top: '20%', size: '16px', opacity: '0.5' },
  { left: '12%', top: '32%', size: '20px', opacity: '0.55' },
  { left: '22%', top: '8%', size: '18px', opacity: '0.45' },
  { left: '32%', top: '25%', size: '14px', opacity: '0.4' },
  { left: '42%', top: '15%', size: '22px', opacity: '0.6' },
  { left: '52%', top: '30%', size: '16px', opacity: '0.48' },
  { left: '62%', top: '22%', size: '20px', opacity: '0.52' },
  { left: '72%', top: '12%', size: '18px', opacity: '0.42' },
  { left: '82%', top: '28%', size: '24px', opacity: '0.58' },
  { left: '92%', top: '18%', size: '16px', opacity: '0.5' },
];

const renderSnowOverlay = (): string =>
  SNOWFLAKE_STYLES.map(
    (flake) =>
      `<span class="email-snowflake" aria-hidden="true" style="left: ${flake.left}; top: ${flake.top}; font-size: ${flake.size}; opacity: ${flake.opacity};">❄</span>`,
  ).join('');

const renderChristmasElements = (): string => `
  <div class="email-christmas-tree" aria-hidden="true" style="position: absolute; bottom: 20px; left: 20px; font-size: 28px; color: #166534; opacity: 0.85; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));">🎄</div>
  <div class="email-present" aria-hidden="true" style="position: absolute; bottom: 20px; right: 20px; font-size: 24px; color: #dc2626; opacity: 0.85; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));">🎁</div>
  <div class="email-lights" aria-hidden="true" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); font-size: 18px; opacity: 0.8;">✨🎇✨</div>
  <div class="email-ornament-1" aria-hidden="true" style="position: absolute; top: 15px; left: 15px; font-size: 16px; color: #dc2626; opacity: 0.7;">🟢</div>
  <div class="email-ornament-2" aria-hidden="true" style="position: absolute; top: 25px; right: 15px; font-size: 14px; color: #7c3aed; opacity: 0.7;">🔵</div>
  <div class="email-ornament-3" aria-hidden="true" style="position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); font-size: 12px; color: #ea580c; opacity: 0.7;">🟡</div>
  <div class="email-candy-cane" aria-hidden="true" style="position: absolute; top: 10px; right: 10px; font-size: 14px; color: #dc2626; opacity: 0.6;">🍭</div>
  <div class="email-star" aria-hidden="true" style="position: absolute; top: -5px; left: 50%; transform: translateX(-50%); font-size: 20px; color: #fbbf24; opacity: 0.9; filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.5));">⭐</div>
`;

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
  const christmasElements = renderChristmasElements();

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      @keyframes email-snowfall {
        0% { transform: translate3d(-12px, -18%, 0); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translate3d(18px, 115%, 0); opacity: 0; }
      }
      @keyframes email-timer-glow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.22); transform: scale(1); }
        50% { box-shadow: 0 0 32px 8px rgba(16, 185, 129, 0.28); transform: scale(1.05); }
      }
      @keyframes email-timer-hand {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      body, table, td { font-family: 'Merriweather', Georgia, serif; }
      .email-card { position: relative; border-radius: 32px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.35); background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(253, 242, 248, 0.92)); box-shadow: 0 28px 60px rgba(15, 23, 42, 0.4); }
      .email-snow-scene { position: relative; }
      .email-snow-scene::before { content: ''; position: absolute; inset: 0; background: linear-gradient(150deg, rgba(127, 29, 29, 0.96), rgba(153, 27, 27, 0.92), rgba(22, 101, 52, 0.88)); }
      .email-snow-scene::after { content: ''; position: absolute; inset: 0; background: url('https://assets.codepen.io/1462889/snow-dots.png') repeat; opacity: 0.08; mix-blend-mode: screen; }
      .email-snow-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
      .email-snowflake { position: absolute; top: -12%; color: #ffffff; text-shadow: 0 0 6px rgba(255, 255, 255, 0.7); animation: email-snowfall linear infinite; }
      .email-card-content { position: relative; padding: 0; }
      .email-card-header { padding: 36px 36px 26px; text-align: center; color: #fff; position: relative; z-index: 2; }
      .email-card-header h1 { margin: 0; font-size: 34px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-family: 'Mountains of Christmas', 'Comic Sans MS', cursive; }
      .email-card-header p { margin: 10px 0 0; font-size: 17px; opacity: 0.9; }
      .email-card-body { padding: 36px; background: rgba(255, 255, 255, 0.96); position: relative; z-index: 2; }
      .email-card-footer { padding: 0 36px 36px; background: rgba(255, 255, 255, 0.96); position: relative; z-index: 2; }
      .email-timer { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
      .email-timer-ring { position: relative; width: 86px; height: 86px; border-radius: 50%; background: conic-gradient(from 180deg at 50% 50%, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.92), rgba(52, 211, 153, 0.95)); display: flex; align-items: center; justify-content: center; animation: email-timer-glow 9s ease-in-out infinite; }
      .email-timer-ring::after { content: ''; position: absolute; inset: 12px; border-radius: 50%; background: #fff; box-shadow: inset 0 8px 18px rgba(15, 23, 42, 0.12); }
      .email-timer-hand { position: absolute; top: 14px; left: 50%; width: 3px; height: 28px; transform-origin: center 26px; background: linear-gradient(to bottom, #047857, #34d399); border-radius: 999px; animation: email-timer-hand 12s linear infinite; }
      .email-timer-info { flex: 1 1 200px; }
      .email-timer-info p { margin: 0 0 6px; font-size: 15px; line-height: 1.6; color: #052e2b; }
      .email-timer-info strong { color: #065f46; }
      .email-timer-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; padding: 6px 16px; background: rgba(5, 150, 105, 0.16); color: #064e3b; border-radius: 999px; margin-bottom: 12px; }
      .email-timer-countdown { margin: 10px 0 0; font-size: 14px; line-height: 1.55; color: #0f766e; }
      @media (prefers-reduced-motion: reduce) {
        .email-snowflake { display: none !important; }
        .email-timer-ring { animation: none !important; }
        .email-timer-hand { display: none !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background: radial-gradient(circle at top, #991b1b 0%, #7f1d1d 45%, #3b0a17 100%); font-family: 'Merriweather', Georgia, serif;">
    <span style="display: none; color: transparent; height: 0; width: 0; opacity: 0; overflow: hidden;">${
      preheader ?? ''
    }</span>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(140deg, rgba(127, 29, 29, 0.92), rgba(76, 29, 149, 0.25) 70%, rgba(6, 95, 70, 0.5)); padding: 40px 0;">
      <tr>
        <td align="center">
          <div style="max-width: 640px; width: 100%; padding: 0 16px;">
            <div class="email-card">
              <div class="email-snow-scene">
                <div class="email-snow-layer" aria-hidden="true">${snowOverlay}</div>
                <div class="email-card-content">
                  <div class="email-card-header">
                    <h1 style="font-family: 'Mountains of Christmas', 'Comic Sans MS', cursive;">Amigo Ocuto</h1>
                    <p style="font-family: 'Merriweather', Georgia, serif;">Deixando o Natal de ${new Date().getFullYear()} ainda mais mágico</p>
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
    subject: 'Confirme a sua inscrição no Amigo Ocuto de Natal',
    intro: 'Que alegria ter você por aqui! Só falta confirmar o e-mail para garantir a sua participação.',
    action: (code, recipientLabel) =>
      `Digite o código <strong>${code}</strong> e finalize a validação do e-mail principal (${recipientLabel}).`,
    footer: 'O código vale por 30 minutos. Se não foi você quem pediu, pode ignorar com tranquilidade.',
  },
  resend: {
    subject: 'Seu novo código para confirmar a participação chegou',
    intro: 'Conforme combinado, aqui está um novo código para concluir a inscrição.',
    action: (code, recipientLabel) =>
      `Informe <strong>${code}</strong> na página de confirmação para validar o endereço ${recipientLabel}.`,
    footer: 'O código anterior deixou de valer. Este expira em 30 minutos.',
  },
  login: {
    subject: 'Seu código de acesso à lista de presentes',
    intro:
      'Recebemos o pedido para abrir a página "Minha lista de presentes". Mantemos esse espaço protegido com um passo adicional.',
    action: (code, recipientLabel) =>
      `Use <strong>${code}</strong> para entrar. A mensagem chegou no endereço ${recipientLabel}.`,
    footer: 'Se você não solicitou este acesso, é só ignorar a mensagem.',
  },
  'update-email': {
    subject: 'Confirme o novo e-mail informado no Amigo Ocuto',
    intro: 'Recebemos o pedido para alterar o e-mail principal da inscrição.',
    action: (code, recipientLabel) =>
      `Digite <strong>${code}</strong> para confirmar o novo endereço (${recipientLabel}) e manter tudo protegido.`,
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
  gifter?: ParticipantEmailData | null,
): Promise<void> => {
  const recipientEmails = resolveRecipients(child);
  if (recipientEmails.length === 0) {
    return;
  }

  const assignedId = assigned.id;
  const mainRecipient = resolveMainRecipient(child, recipientEmails);
  const greeting = mainRecipient
    ? `Olá família de ${child.firstName},`
    : `Olá famílias responsáveis por ${child.firstName},`;

  const childFullName = [child.firstName, child.secondName]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(' ');

  const assignedFullName = [assigned.firstName, assigned.secondName]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(' ');

  const gifterFullName = gifter
    ? [gifter.firstName, gifter.secondName].filter((value): value is string => Boolean(value && value.trim().length > 0)).join(' ')
    : null;
  const gifterId = gifter?.id ?? null;

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
      ? `<p style="${paragraphStyle}">${assigned.firstName} ainda não registou preferências de presente. Quando a lista estiver pronta, pode incentivar ${child.firstName} a escolher algo que combine com a pessoa sorteada.</p>`
      : `
        <div style="margin: 24px 0; padding: 24px; border-radius: 20px; border: 1px solid rgba(217, 70, 239, 0.18); background: linear-gradient(160deg, rgba(253, 242, 248, 0.96), rgba(254, 226, 226, 0.9)); box-shadow: 0 20px 44px rgba(190, 24, 93, 0.18);">
          <p style="margin: 0 0 12px; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #9f1239; font-weight: 700;">Sugestões do amigo sorteado</p>
          <p style="${paragraphStyle} margin-bottom: 12px;">Estas são as ideias de presentes que ${assigned.firstName} registou. Partilhem com ${child.firstName} para preparar uma surpresa à altura:</p>
          <ul style="margin: 0 0 0 20px; padding: 0; color: #052e2b;">
            ${gifts
              .map((gift) => {
                const priority = gift.priority ? ` (prioridade ${gift.priority})` : '';
                const notes = gift.description ?? gift.notes;
                const description = notes ? ` – ${notes}` : '';
                const link = gift.url
                  ? ` – <a href="${gift.url}" style="color: #2563eb; text-decoration: underline;">${gift.url}</a>`
                  : '';
                return `<li style="margin-bottom: 10px; font-size: 16px; line-height: 1.55;"><strong>${gift.name}</strong>${priority}${description}${link}</li>`;
              })
              .join('')}
          </ul>
        </div>
      `;

  const gifterHighlightHtml = gifterFullName
    ? `
      <div style="margin: 24px 0; padding: 24px; border-radius: 20px; border: 1px solid rgba(5, 150, 105, 0.3); background: linear-gradient(160deg, rgba(209, 250, 229, 0.95), rgba(134, 239, 172, 0.9)); box-shadow: 0 20px 40px rgba(4, 120, 87, 0.18);">
        <p style="margin: 0 0 12px; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #047857; font-weight: 700;">Quem vai presentear ${child.firstName}</p>
        <p style="${paragraphStyle} margin-bottom: 8px; color: #064e3b;">O presente de Natal de ${childFullName} será preparado por <strong>${gifterFullName}</strong>.</p>
        ${gifterId ? `<p style="${paragraphStyle} margin-bottom: 0; color: #064e3b;">ID de referência: <strong>${gifterId}</strong></p>` : ''}
      </div>
    `
    : '';

  const assignmentHighlightHtml = `
    <div style="margin: 24px 0; padding: 24px; border-radius: 20px; border: 1px solid rgba(185, 28, 28, 0.3); background: linear-gradient(160deg, rgba(254, 226, 226, 0.96), rgba(252, 165, 165, 0.9)); box-shadow: 0 20px 44px rgba(153, 27, 27, 0.2);">
      <p style="margin: 0 0 12px; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #9b1c1c; font-weight: 700;">Quem ${child.firstName} vai presentear</p>
      <p style="${paragraphStyle} margin-bottom: 8px; color: #7f1d1d;">${childFullName} tirou <strong>${assignedFullName}</strong> no sorteio.</p>
      <p style="${paragraphStyle} margin-bottom: 0; color: #7f1d1d;">ID para guardar: <strong>${assignedId}</strong></p>
    </div>
  `;

  const content = `
    <p style="${paragraphStyle}">O sorteio do Amigo Ocuto foi concluído com sucesso! Reunimos abaixo todas as informações importantes para acompanhar ${childFullName}.</p>
    ${eventDetailsHtml}
    ${gifterHighlightHtml}
    ${assignmentHighlightHtml}
    ${giftItemsHtml}
    <p style="${paragraphStyle}">Apoie ${child.firstName} na escolha e na entrega do presente, e guarde este e-mail para qualquer dúvida com a organização.</p>
  `;

  const preheaderLocation = eventInfo.location
    ? ` Encontro em ${eventInfo.location}.`
    : '';

  const html = renderEmailTemplate({
    title: `Sorteio confirmado para ${child.firstName}`,
    preheader: `Veja quem ${child.firstName} vai presentear e quem prepara uma surpresa para ${child.firstName}.${preheaderLocation}`,
    greeting,
    content,
  });

  await mailer.sendMail({
    to: recipientEmails,
    subject: `Amigo Ocuto • ${child.firstName} já tem amigo secreto!`,
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
  const assignedIsChild = Boolean(assigned.isChild);
  const mainRecipient = resolveMainRecipient(participant, recipientEmails);
  const greeting = mainRecipient
    ? `Olá ${participant.firstName},`
    : 'Olá,';

  const assignedFullName = [assigned.firstName, assigned.secondName]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(' ');

  const guardianContacts = assignedIsChild
    ? buildGuardianList(
        assigned.primaryGuardianEmail ?? undefined,
        Array.isArray(assigned.guardianEmails) ? assigned.guardianEmails : [],
      )
    : [];

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
      ? `<p style="${paragraphStyle}">${
          assignedIsChild
            ? `${assigned.firstName} ainda não tem uma lista publicada. Converse com os responsáveis para alinhar preferências e surpreender a criança com carinho.`
            : 'O participante sorteado ainda não cadastrou preferências de presente. Que tal surpreender com algo especial?'
        }</p>`
      : `
        <div style="margin: 24px 0; padding: 24px; border-radius: 20px; border: 1px solid rgba(67, 56, 202, 0.25); background: linear-gradient(160deg, rgba(237, 233, 254, 0.96), rgba(221, 214, 254, 0.92)); box-shadow: 0 20px 44px rgba(79, 70, 229, 0.18);">
          <p style="margin: 0 0 12px; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #4338ca; font-weight: 700;">${assignedIsChild ? 'Desejos da criança' : 'Sugestões do amigo sorteado'}</p>
          <p style="${paragraphStyle} margin-bottom: 12px;">${
            assignedIsChild
              ? `Estas são as pistas reunidas pelos responsáveis de ${assigned.firstName}. Use-as para preparar uma surpresa segura e cheia de significado.`
              : `Estas são as preferências partilhadas por ${assigned.firstName}. Use-as como guia para escolher o presente perfeito.`
          }</p>
          <ul style="margin: 0 0 0 20px; padding: 0; color: #052e2b;">
            ${gifts
              .map((gift) => {
                const priority = gift.priority ? ` (prioridade ${gift.priority})` : '';
                const notes = gift.description ?? gift.notes;
                const description = notes ? ` – ${notes}` : '';
                const link = gift.url
                  ? ` – <a href="${gift.url}" style="color: #2563eb; text-decoration: underline;">${gift.url}</a>`
                  : '';
                return `<li style="margin-bottom: 10px; font-size: 16px; line-height: 1.55;"><strong>${gift.name}</strong>${priority}${description}${link}</li>`;
              })
              .join('')}
          </ul>
        </div>
      `;

  const guardianContactHtml = assignedIsChild && guardianContacts.length > 0
    ? `
      <div style="margin: 24px 0; padding: 24px; border-radius: 20px; border: 1px solid rgba(245, 158, 11, 0.35); background: linear-gradient(160deg, rgba(254, 249, 195, 0.95), rgba(254, 240, 138, 0.9)); box-shadow: 0 20px 42px rgba(180, 83, 9, 0.18);">
        <p style="margin: 0 0 12px; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #b45309; font-weight: 700;">Contactos dos responsáveis</p>
        <p style="${paragraphStyle} margin-bottom: 12px;">Combine detalhes com quem cuida de ${assigned.firstName} antes da troca de presentes:</p>
        <ul style="margin: 0 0 0 20px; padding: 0; color: #052e2b;">
          ${guardianContacts
            .map((email) => `<li style='margin-bottom: 8px; font-size: 16px; line-height: 1.55;'>${email}</li>`)
            .join('')}
        </ul>
      </div>
    `
    : '';

  const assignmentHighlightHtml = assignedIsChild
    ? `
      <div style="margin: 24px 0; padding: 24px; border-radius: 20px; border: 1px solid rgba(185, 28, 28, 0.3); background: linear-gradient(160deg, rgba(254, 226, 226, 0.96), rgba(252, 165, 165, 0.9)); box-shadow: 0 20px 44px rgba(153, 27, 27, 0.2);">
        <p style="margin: 0 0 12px; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #9b1c1c; font-weight: 700;">Você tirou uma criança encantadora</p>
        <p style="${paragraphStyle} margin-bottom: 8px; color: #7f1d1d;">O presente irá para <strong>${assignedFullName}</strong>.</p>
        <p style="${paragraphStyle} margin-bottom: 0; color: #7f1d1d;">ID para referência: <strong>${assignedId}</strong></p>
      </div>
    `
    : `
      <div style="margin: 24px 0; padding: 24px; border-radius: 20px; border: 1px solid rgba(190, 24, 93, 0.28); background: linear-gradient(160deg, rgba(254, 205, 211, 0.96), rgba(251, 182, 206, 0.9)); box-shadow: 0 20px 44px rgba(190, 24, 93, 0.2);">
        <p style="margin: 0 0 12px; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #be123c; font-weight: 700;">Seu amigo oculto</p>
        <p style="${paragraphStyle} margin-bottom: 8px; color: #831843;">Você vai presentear <strong>${assignedFullName}</strong>.</p>
        <p style="${paragraphStyle} margin-bottom: 0; color: #831843;">ID para guardar: <strong>${assignedId}</strong></p>
      </div>
    `;

  const introMessage = assignedIsChild
    ? `Este e-mail confirma o resultado do sorteio: você foi sorteado com ${assignedFullName}, uma criança que faz parte da celebração.`
    : 'O sorteio do Amigo Ocuto foi realizado com sucesso! Aqui estão os detalhes do seu amigo oculto.';

  const closingMessage = assignedIsChild
    ? `Combine com os responsáveis, prepare algo especial e guarde este e-mail para consultar sempre que precisar.`
    : 'Prepare um presente especial e guarde este e-mail para referência futura.';

  const content = `
    <p style="${paragraphStyle}">${introMessage}</p>
    ${eventDetailsHtml}
    ${assignmentHighlightHtml}
    ${guardianContactHtml}
    ${giftItemsHtml}
    <p style="${paragraphStyle}">${closingMessage}</p>
  `;

  const preheaderLocation = eventInfo.location
    ? ` Encontro em ${eventInfo.location}.`
    : '';

  const html = renderEmailTemplate({
    title: assignedIsChild ? `Você tirou ${assigned.firstName}!` : 'Seu Sorteio do Amigo Ocuto',
    preheader: assignedIsChild
      ? `Você foi sorteado com ${assigned.firstName}.${preheaderLocation} Veja contatos e preferências.`
      : `O sorteio do evento ${eventInfo.name} foi realizado.${preheaderLocation} Descubra quem você vai presentear.`,
    greeting,
    content,
  });

  await mailer.sendMail({
    to: recipientEmails,
    subject: assignedIsChild
      ? `Amigo Ocuto • ${assigned.firstName} é o seu amigo secreto`
      : 'Seu Sorteio do Amigo Ocuto',
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
