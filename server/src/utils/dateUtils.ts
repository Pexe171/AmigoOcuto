/**
 * Returns the current UTC timestamp as an ISO string.
 * Ensures all dates are stored in UTC consistently.
 */
export const getCurrentUTCTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Returns a future UTC timestamp as an ISO string, adding the specified number of minutes.
 * Useful for calculating expiration times.
 */
export const getFutureUTCTimestamp = (minutesToAdd: number): string => {
  return new Date(Date.now() + minutesToAdd * 60 * 1000).toISOString();
};
