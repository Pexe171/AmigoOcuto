import type { Request, Response, NextFunction } from 'express';
import { metricsEnabled, recordHttpMetric } from '../observability/metrics';

export const requestMetrics = (req: Request, res: Response, next: NextFunction): void => {
  if (!metricsEnabled) {
    next();
    return;
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    recordHttpMetric(req.method, req.path, res.statusCode, duration);
  });

  next();
};
