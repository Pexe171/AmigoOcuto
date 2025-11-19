/**
 * Returns the current UTC timestamp as an ISO string.
 * Ensures all dates are stored in UTC consistently.
 */
export const getCurrentUTCTimestamp = (): string => {
  return new Date().toISOString();
};
