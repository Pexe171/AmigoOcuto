import { Response } from 'express';
import { Types } from 'mongoose';
import { ZodError } from 'zod';
import { normalizeEmail } from './emailUtils';

/**
 * Erro HTTP com status e metadados opcionais para mensagens consistentes.
 */
export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly cause?: unknown;

  constructor(
    message: string,
    statusCode = 400,
    options: { code?: string; details?: unknown; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    if (typeof options.code !== 'undefined') {
      this.code = options.code;
    }
    if (typeof options.details !== 'undefined') {
      this.details = options.details;
    }
    if (typeof options.cause !== 'undefined') {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(
    message: string,
    options?: { code?: string; details?: unknown; cause?: unknown },
  ): HttpError {
    return new HttpError(message, 400, options);
  }

  static unauthorized(
    message: string,
    options?: { code?: string; details?: unknown; cause?: unknown },
  ): HttpError {
    return new HttpError(message, 401, options);
  }

  static forbidden(
    message: string,
    options?: { code?: string; details?: unknown; cause?: unknown },
  ): HttpError {
    return new HttpError(message, 403, options);
  }

  static notFound(
    message: string,
    options?: { code?: string; details?: unknown; cause?: unknown },
  ): HttpError {
    return new HttpError(message, 404, options);
  }

  static conflict(
    message: string,
    options?: { code?: string; details?: unknown; cause?: unknown },
  ): HttpError {
    return new HttpError(message, 409, options);
  }

  static internal(
    message: string,
    options?: { code?: string; details?: unknown; cause?: unknown },
  ): HttpError {
    return new HttpError(message, 500, options);
  }
}

export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;

interface ErrorResponseBody {
  message: string;
  code?: string;
  details?: unknown;
}

const buildFromZodError = (error: ZodError): { statusCode: number; body: ErrorResponseBody } => {
  const flattened = error.flatten();
  const fieldMessages = Object.values(flattened.fieldErrors) as Array<string[] | undefined>;
  const firstFieldMessage = fieldMessages.reduce<string | undefined>(
    (acc, messages) => acc ?? messages?.[0],
    undefined,
  );

  const issueMessage =
    flattened.formErrors[0] ??
    firstFieldMessage ??
    error.issues[0]?.message ??
    'Dados inválidos.';

  return {
    statusCode: 400,
    body: {
      message: issueMessage,
      details: {
        formErrors: flattened.formErrors,
        fieldErrors: flattened.fieldErrors,
      },
    },
  };
};

const buildFromUnknownError = (
  error: unknown,
  fallbackStatus: number,
): { statusCode: number; body: ErrorResponseBody } => {
  if (isHttpError(error)) {
    const body: ErrorResponseBody = { message: error.message };
    if (error.code) {
      body.code = error.code;
    }
    if (typeof error.details !== 'undefined') {
      body.details = error.details;
    }
    return { statusCode: error.statusCode, body };
  }

  if (error instanceof ZodError) {
    return buildFromZodError(error);
  }

  if (error instanceof Error) {
    return {
      statusCode: fallbackStatus,
      body: { message: error.message || 'Ocorreu um erro inesperado.' },
    };
  }

  return {
    statusCode: fallbackStatus,
    body: { message: 'Ocorreu um erro inesperado.' },
  };
};

export const respondWithError = (
  res: Response,
  error: unknown,
  fallbackStatus = 500,
): void => {
  const { statusCode, body } = buildFromUnknownError(error, fallbackStatus);

  if (!isHttpError(error) && !(error instanceof ZodError) && statusCode >= 500) {
    console.error('[ERRO NÃO TRATADO]', error);
  }

  res.status(statusCode).json(body);
};

const withLabel = (label?: string): string => (label ? ` ${label}` : '');

export const requireObjectIdParam = (
  value: string | undefined,
  { resourceLabel }: { resourceLabel?: string } = {},
): string => {
  const label = withLabel(resourceLabel);
  if (!value) {
    throw HttpError.badRequest(`Informe o identificador${label}.`);
  }
  if (!Types.ObjectId.isValid(value)) {
    throw HttpError.badRequest(
      `ID${label} inválido. O ID deve ter 24 caracteres hexadecimais.`,
    );
  }
  return value;
};

export const requireEmailParam = (
  value: string | undefined,
  {
    resourceLabel,
    decode = true,
  }: {
    resourceLabel?: string;
    decode?: boolean;
  } = {},
): string => {
  const label = withLabel(resourceLabel);
  if (!value) {
    throw HttpError.badRequest(`Informe o e-mail${label}.`);
  }

  let decoded = value;
  if (decode) {
    try {
      decoded = decodeURIComponent(value);
    } catch (error) {
      throw HttpError.badRequest(
        'O e-mail informado na URL está codificado de forma inválida. Certifique-se de usar encodeURIComponent antes de chamar a API.',
        { cause: error },
      );
    }
  }

  const trimmed = decoded.trim();
  if (!trimmed) {
    throw HttpError.badRequest(`Informe o e-mail${label}.`);
  }

  return normalizeEmail(trimmed);
};
