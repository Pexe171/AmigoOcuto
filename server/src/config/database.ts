import mongoose from 'mongoose';
import { env } from './environment';

export const connectDatabase = async (): Promise<typeof mongoose> => {
  mongoose.set('strictQuery', false);
  return mongoose.connect(env.MONGO_URI);
};
