import mongoose, { ConnectOptions } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoServerError } from 'mongodb';
import { env } from './environment';

/**
 * Camada de ligação ao MongoDB. O objetivo é deixar claro quando usamos um banco
 * real ou a instância em memória, e explicar as mensagens de erro mais comuns.
 */

let memoryServer: MongoMemoryServer | null = null;

const connectWithUri = async (
  uri: string,
  options: ConnectOptions = {}
): Promise<typeof mongoose> => mongoose.connect(uri, options);

const ensureInMemoryServer = async (): Promise<string> => {
  if (!memoryServer) {
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: env.MONGO_DB_NAME }
    });
  }

  return memoryServer.getUri();
};

// Alguns servidores Mongo devolvem códigos específicos quando falta permissão.
const isUnauthorized = (error: unknown): error is MongoServerError =>
  error instanceof MongoServerError && (error.code === 13 || error.code === 8000);

const assertFindPermission = async (): Promise<void> => {
  const database = mongoose.connection.db;

  if (!database) {
    return;
  }

  try {
    await database.collection('participants').findOne({}, { projection: { _id: 1 } });
  } catch (error) {
    if (isUnauthorized(error)) {
      throw error;
    }
  }
};

const connectInMemory = async (): Promise<typeof mongoose> => {
  const inMemoryUri = await ensureInMemoryServer();
  console.info('MongoDB em memória inicializado (MONGO_IN_MEMORY=true).');
  return connectWithUri(inMemoryUri, { dbName: env.MONGO_DB_NAME });
};

export const connectDatabase = async (): Promise<typeof mongoose> => {
  mongoose.set('strictQuery', false);

  // Quando o .env força o modo em memória, honramos a escolha de imediato.
  if (env.MONGO_IN_MEMORY) {
    return connectInMemory();
  }

  try {
    const connection = await connectWithUri(env.MONGO_URI, { dbName: env.MONGO_DB_NAME });

    try {
      await assertFindPermission();
      return connection;
    } catch (error) {
      if (!isUnauthorized(error)) {
        throw error;
      }

      if (env.NODE_ENV === 'production') {
        console.error(
          'O utilizador configurado no MongoDB não possui permissão de leitura (find) na coleção participants.',
        );
        throw new Error(
          'Falha ao conectar ao MongoDB: conceda permissão de leitura (find) ao utilizador configurado.',
        );
      }

      console.warn(
        'Usuário do MongoDB sem permissão de leitura. Iniciando instância MongoDB em memória para desenvolvimento.',
      );

      await mongoose.disconnect();
      return connectInMemory();
    }
  } catch (error) {
    if (isUnauthorized(error)) {
      console.error(
        'O utilizador configurado no MongoDB não possui permissão de leitura (find) na coleção participants.',
      );
      throw new Error(
        'Falha ao conectar ao MongoDB: conceda permissão de leitura (find) ao utilizador configurado.',
      );
    }

    if (
      error instanceof mongoose.Error.MongooseServerSelectionError &&
      env.NODE_ENV !== 'production'
    ) {
      console.warn(
        'Falha ao conectar usando MONGO_URI. Iniciando instância MongoDB em memória para desenvolvimento.'
      );
      console.info(
        'Caso prefira iniciar diretamente no modo em memória, defina MONGO_IN_MEMORY=true no seu arquivo .env.'
      );
      return connectInMemory();
    }

    throw error;
  }
};
