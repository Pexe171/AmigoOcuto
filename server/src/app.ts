import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import participantRoutes from './routes/participantRoutes';
import adminRoutes from './routes/adminRoutes';
import giftListRoutes, { giftListByEmailRouter } from './routes/giftListRoutes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint de diagnóstico para verificar o MongoDB
app.get('/api/debug/db-status', async (_req, res) => {
  try {
    const { ParticipantModel } = await import('./models/Participant');
    const { PendingParticipantModel } = await import('./models/PendingParticipant');
    const { GiftListModel } = await import('./models/GiftList');
    
    const participants = await ParticipantModel.countDocuments();
    const pending = await PendingParticipantModel.countDocuments();
    const giftLists = await GiftListModel.countDocuments();
    
    res.json({
      status: 'connected',
      counts: {
        verifiedParticipants: participants,
        pendingParticipants: pending,
        giftLists: giftLists
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: (error as Error).message
    });
  }
});

// Rotas mais específicas primeiro
app.use('/api/participants/by-email', giftListByEmailRouter);
app.use('/api/participants/:participantId/gifts', giftListRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/admin', adminRoutes);

export default app;
