export type ParsedName = {
  firstName: string;
  secondName: string;
  fullName: string;
};

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/g, ' ');

export const splitFullName = (rawName: string): ParsedName => {
  const normalized = normalizeWhitespace(rawName);
  const [first, ...rest] = normalized.split(' ');
  const firstName = first ?? '';
  const remainder = rest.join(' ').trim();
  const secondName = remainder.length > 0 ? remainder : firstName;
  const fullName = remainder.length > 0 ? `${firstName} ${remainder}` : firstName;

  return {
    firstName,
    secondName,
    fullName,
  };
};

export const ensureNames = (
  options: { fullName?: string | null; firstName?: string | null; secondName?: string | null },
): ParsedName => {
  if (options.fullName) {
    return splitFullName(options.fullName);
  }

  const firstName = options.firstName?.trim() ?? '';
  const secondName = options.secondName?.trim() ?? '';

  if (!firstName && !secondName) {
    return { firstName: '', secondName: '', fullName: '' };
  }

  if (!secondName) {
    return {
      firstName,
      secondName: firstName,
      fullName: firstName,
    };
  }

  return {
    firstName,
    secondName,
    fullName: `${firstName} ${secondName}`.trim(),
  };
};
