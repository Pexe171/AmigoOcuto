/**
 * Formats a UTC ISO string to a localized date string in the user's locale.
 * Assumes the input is in UTC and converts to local time for display.
 */
export const formatDateToLocal = (utcIsoString: string): string => {
  const date = new Date(utcIsoString);
  return date.toLocaleDateString();
};

/**
 * Formats a UTC ISO string to a localized date and time string in the user's locale.
 * Assumes the input is in UTC and converts to local time for display.
 */
export const formatDateTimeToLocal = (utcIsoString: string): string => {
  const date = new Date(utcIsoString);
  return date.toLocaleString();
};
