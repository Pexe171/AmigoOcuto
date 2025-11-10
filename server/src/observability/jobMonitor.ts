import db from '../config/sqliteDatabase';
import { recordCronMetric } from './metrics';
import { logger, logStructuredError } from './logger';
import { withSpan } from './tracing';

const insertExecution = db.prepare(
  `INSERT INTO jobExecutions (jobName, status, message) VALUES (@jobName, @status, @message)`,
);

const updateExecution = db.prepare(
  `UPDATE jobExecutions SET status=@status, message=@message, finishedAt=CURRENT_TIMESTAMP WHERE id=@id`,
);

export const runMonitoredJob = async (
  jobName: string,
  task: () => Promise<void>,
): Promise<void> => {
  const result = insertExecution.run({ jobName, status: 'running', message: null });
  const executionId = Number(result.lastInsertRowid);
  const startTime = Date.now();

  try {
    await withSpan(`cron:${jobName}`, async () => {
      await task();
    });
    recordCronMetric(jobName, 'success', (Date.now() - startTime) / 1000);
    updateExecution.run({ id: executionId, status: 'success', message: null });
  } catch (error) {
    recordCronMetric(jobName, 'error', (Date.now() - startTime) / 1000);
    updateExecution.run({
      id: executionId,
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
    logger.error({ event: 'cron:job-error', jobName, error: logStructuredError(error) }, 'Erro no job cron');
  }
};
