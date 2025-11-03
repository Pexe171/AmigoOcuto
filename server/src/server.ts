import http from 'http';
import app from './app';
import { env } from './config/environment';
import { connectDatabase } from './config/database';

const start = async (): Promise<void> => {
  try {
    await connectDatabase();
    const server = http.createServer(app);
    server.listen(env.PORT, () => {
      console.log(`Servidor iniciado na porta ${env.PORT}`);
    });
  } catch (error) {
    console.error('Falha ao iniciar o servidor', error);
    process.exit(1);
  }
};

void start();
