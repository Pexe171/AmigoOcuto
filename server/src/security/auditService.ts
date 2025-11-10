import fs from 'fs';
import path from 'path';
import { env } from '../config/environment';
import { recordAuthMetric } from '../observability/metrics';
import { logger } from '../observability/logger';

export type AuthAuditEvent = {
  subject: 'admin' | 'participant';
  outcome: 'success' | 'failure';
  email?: string;
  reason?: string;
};

const auditFilePath = env.AUDIT_LOG_PATH;
const auditDir = path.dirname(auditFilePath);

if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true });
}

export const recordAuthEvent = (event: AuthAuditEvent): void => {
  const payload = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  recordAuthMetric(event.subject, event.outcome);
  fs.appendFileSync(auditFilePath, `${JSON.stringify(payload)}\n`, { encoding: 'utf-8' });
  logger.info({ event: 'auth:audit', payload }, 'Evento de autenticação registrado');
};
