import { logger } from './logger';

type Span = {
  name: string;
  startTime: number;
  attributes: Record<string, unknown>;
  recordException: (error: unknown) => void;
  end: () => void;
};

const createSpan = (name: string): Span => {
  const startTime = Date.now();
  return {
    name,
    startTime,
    attributes: {},
    recordException: (error: unknown) => {
      logger.error({ event: 'tracing:span-exception', span: name, error }, 'Exceção registada no span');
    },
    end: () => {
      const duration = Date.now() - startTime;
      logger.debug({ event: 'tracing:span-end', span: name, durationMs: duration }, 'Span finalizado');
    },
  };
};

export const withSpan = async <T>(name: string, callback: (span: Span) => Promise<T>): Promise<T> => {
  const span = createSpan(name);
  try {
    return await callback(span);
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
};
