import http from 'http';
import app from './app';
import { env } from './config/environment';
import { connectDatabase } from './config/database';

const start = async (): Promise<void> => {
  try {
    await connectDatabase();
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
