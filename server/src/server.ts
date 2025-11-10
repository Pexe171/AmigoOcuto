import http from 'http';
import cron from 'node-cron';
import app from './app';
import { env } from './config/environment';
import sqliteDb from './config/sqliteDatabase';
import { getEventsNeedingReminder } from './services/eventService';
import { sendDrawReminderEmail } from './services/emailService';
import { runMonitoredJob } from './observability/jobMonitor';
import { logger, logStructuredError } from './observability/logger';

const start = async (): Promise<void> => {
  try {
    logger.info({ event: 'bootstrap', database: sqliteDb.name ?? 'sqlite' }, 'SQLite inicializado');

    // Set up cron job to check for events needing reminders every minute
    cron.schedule('* * * * *', async () => {
      await runMonitoredJob('draw-reminder-email', async () => {
        const eventsNeedingReminder = await getEventsNeedingReminder();
        for (const event of eventsNeedingReminder) {
          if (event.moderatorEmail) {
            await sendDrawReminderEmail(event.moderatorEmail, event.name, event.id, event.drawDateTime!);
            logger.info(
              { event: 'reminder:sent', eventId: event.id, moderator: event.moderatorEmail },
              'Lembrete de sorteio enviado',
            );
          }
        }
      });
    });

    const server = http.createServer(app);

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error({ event: 'server:port-in-use', port: env.PORT }, 'Porta já está em uso');
      } else {
        logger.error({ event: 'server:error', error: logStructuredError(error) }, 'Erro ao iniciar');
      }
      process.exit(1);
    });

    server.listen(env.PORT, () => {
      logger.info({ event: 'server:listening', port: env.PORT }, 'Servidor iniciado');
    });
  } catch (error) {
    logger.error({ event: 'bootstrap:error', error: logStructuredError(error) }, 'Falha ao iniciar o servidor');
    process.exit(1);
  }
};

void start();
