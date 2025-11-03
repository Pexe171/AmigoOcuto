export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateTicketCode = (): string => {
  return `TCK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};
