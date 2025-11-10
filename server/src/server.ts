import http from 'http';
import app from './app';
import { env } from './config/environment';
import sqliteDb from './config/sqliteDatabase'; // Import the SQLite database instance
import cron from 'node-cron';
import { getEventsNeedingReminder } from './services/eventService';
import { sendDrawReminderEmail } from './services/emailService';

const start = async (): Promise<void> => {
  try {
    // No need to call anything for SQLite, as it's initialized on import
    // You can add a simple check or log here if needed
    console.log('✅ SQLite database ready.');

    // Set up cron job to check for events needing reminders every minute
    cron.schedule('* * * * *', async () => {
      try {
        const eventsNeedingReminder = await getEventsNeedingReminder();
        for (const event of eventsNeedingReminder) {
          if (event.moderatorEmail) {
            await sendDrawReminderEmail(event.moderatorEmail, event.name, event.id, event.drawDateTime!);
            console.log(`Reminder sent for event ${event.name} (${event.id})`);
          }
        }
      } catch (error) {
        console.error('Error sending draw reminders:', error);
      }
    });

    const server = http.createServer(app);

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Erro: A porta ${env.PORT} já está em uso.`);
        console.error('💡 Soluções:');
        console.error('   1. Encerre o processo que está usando a porta 4000');
        console.error('   2. Ou altere a porta no arquivo .env (PORT=4001)');
        console.error('\nPara Windows, use: netstat -ano | findstr :4000');
        console.error('Depois: taskkill /PID <PID> /F\n');
      } else {
        console.error('Erro ao iniciar o servidor:', error);
      }
      process.exit(1);
    });

    server.listen(env.PORT, () => {
      console.log(`✅ Servidor iniciado na porta ${env.PORT}`);
    });
  } catch (error) {
    console.error('Falha ao iniciar o servidor', error);
    process.exit(1);
  }
};

void start();
