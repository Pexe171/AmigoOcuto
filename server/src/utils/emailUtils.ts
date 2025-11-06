/**
 * Utilidades partilhadas para normalizar e deduplicar endereços de e-mail.
 * Mantemos tudo em minúsculas e sem espaços para evitar cadastros duplicados.
 */

export type NullableEmail = string | null | undefined;

/** Normaliza um endereço de e-mail retirando espaços e convertendo para minúsculas. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/**
 * Normaliza um e-mail opcional. Se nenhum valor válido for enviado, devolve `null`.
 */
export const normalizeNullableEmail = (email: NullableEmail): string | null => {
  if (!email || typeof email !== 'string') {
    return null;
  }
  const trimmed = email.trim();
  return trimmed ? normalizeEmail(trimmed) : null;
};

/**
 * Remove valores vazios, normaliza e devolve apenas endereços únicos.
 */
export const normalizeEmailList = (emails: NullableEmail[] = []): string[] => {
  const unique = new Set<string>();
  emails.forEach((email) => {
    const normalized = normalizeNullableEmail(email);
    if (normalized) {
      unique.add(normalized);
    }
  });
  return Array.from(unique);
};

/**
 * Combina e deduplica e-mails de responsáveis, preservando a ordem natural
 * (principal primeiro, depois os adicionais).
 */
export const collectGuardianEmails = (
  primary: NullableEmail,
  extras: NullableEmail[] = [],
): string[] => {
  const normalizedPrimary = normalizeNullableEmail(primary);
  const normalizedExtras = normalizeEmailList(extras);
  const ordered = normalizedPrimary ? [normalizedPrimary, ...normalizedExtras] : normalizedExtras;
  return normalizeEmailList(ordered);
};

export type ParticipantEmailAddresses = {
  isChild: boolean;
  email?: NullableEmail;
  primaryGuardianEmail?: NullableEmail;
  guardianEmails?: NullableEmail[];
};

/**
 * Resolve os destinatários oficiais (em ordem) para qualquer participante.
 * Crianças recebem disparos nos e-mails de responsáveis; adultos, no próprio.
 */
export const resolveParticipantRecipients = (
  participant: ParticipantEmailAddresses,
): string[] => {
  const guardianList = collectGuardianEmails(
    participant.primaryGuardianEmail ?? null,
    participant.guardianEmails ?? [],
  );

  if (participant.isChild) {
    return guardianList;
  }

  const normalizedEmail = normalizeNullableEmail(participant.email);
  if (normalizedEmail) {
    return [normalizedEmail];
  }

  return guardianList;
};

/**
 * Decide qual endereço deve aparecer como principal numa mensagem transacional.
 */
export const resolveMainRecipient = (
  participant: ParticipantEmailAddresses,
  resolvedRecipients: string[],
): string | null => {
  if (participant.isChild) {
    const primary = normalizeNullableEmail(participant.primaryGuardianEmail);
    return primary ?? resolvedRecipients[0] ?? null;
  }

  const normalizedEmail = normalizeNullableEmail(participant.email);
  if (normalizedEmail) {
    return normalizedEmail;
  }

  return resolvedRecipients[0] ?? null;
};

/**
 * Deduplica uma lista já normalizada (ou mista) de e-mails arbitrários.
 */
export const dedupeEmails = (emails: NullableEmail[]): string[] => normalizeEmailList(emails);
