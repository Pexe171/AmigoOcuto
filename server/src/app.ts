import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import participantRoutes from './routes/participantRoutes';
import adminRoutes from './routes/adminRoutes';
import giftListRoutes from './routes/giftListRoutes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rotas mais específicas primeiro
app.use('/api/gift-lists', giftListRoutes); // Changed base path
app.use('/api/participants', participantRoutes);
app.use('/api/admin', adminRoutes);

export default app;
