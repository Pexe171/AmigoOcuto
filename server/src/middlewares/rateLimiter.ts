import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';

const buckets = new Map<string, { count: number; resetAt: number }>();
const windowMs = env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const key = req.ip ?? req.headers['x-forwarded-for']?.toString() ?? 'anonymous';
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }

  if (entry.count >= env.RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('Retry-After', retryAfter.toString());
    res.status(429).json({ message: 'Limite de requisições excedido. Tente novamente em instantes.' });
    return;
  }

  entry.count += 1;
  next();
};

export const resetRateLimiter = (): void => {
  buckets.clear();
};
