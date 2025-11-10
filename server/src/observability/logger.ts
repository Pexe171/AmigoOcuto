import { env } from '../config/environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelWeights: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const activeLevel = levelWeights[env.LOG_LEVEL as LogLevel] ?? levelWeights.info;

const write = (level: LogLevel, message: string, details?: Record<string, unknown>): void => {
  if (levelWeights[level] < activeLevel) {
    return;
  }

  const payload = {
    level,
    message,
    details: details ?? {},
    service: 'amigo-ocuto-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
};

export const logger = {
  debug: (details: Record<string, unknown>, message: string) => write('debug', message, details),
  info: (details: Record<string, unknown>, message: string) => write('info', message, details),
  warn: (details: Record<string, unknown>, message: string) => write('warn', message, details),
  error: (details: Record<string, unknown>, message: string) => write('error', message, details),
};

export const logStructuredError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return { message: String(error) };
};
