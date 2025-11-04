import mongoose, { ConnectOptions } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './environment';

let memoryServer: MongoMemoryServer | null = null;

const connectWithUri = async (
  uri: string,
  options: ConnectOptions = {}
): Promise<typeof mongoose> => mongoose.connect(uri, options);

const ensureInMemoryServer = async (): Promise<string> => {
  if (!memoryServer) {
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: 'amigoocuto' }
    });
  }

  return memoryServer.getUri();
};

export const connectDatabase = async (): Promise<typeof mongoose> => {
  mongoose.set('strictQuery', false);

  if (env.MONGO_IN_MEMORY) {
    const inMemoryUri = await ensureInMemoryServer();
    console.info('MongoDB em memória inicializado (MONGO_IN_MEMORY=true).');
    return connectWithUri(inMemoryUri, { dbName: 'amigoocuto' });
  }

  try {
    return await connectWithUri(env.MONGO_URI);
  } catch (error) {
    if (
      error instanceof mongoose.Error.MongooseServerSelectionError &&
      env.NODE_ENV !== 'production'
    ) {
      console.warn(
        'Falha ao conectar usando MONGO_URI. Iniciando instância MongoDB em memória para desenvolvimento.'
      );
      const inMemoryUri = await ensureInMemoryServer();
      console.info(
        'Caso prefira iniciar diretamente no modo em memória, defina MONGO_IN_MEMORY=true no seu arquivo .env.'
      );
      return connectWithUri(inMemoryUri, { dbName: 'amigoocuto' });
    }

    throw error;
  }
};
