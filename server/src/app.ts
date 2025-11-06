import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import participantRoutes from './routes/participantRoutes';
import adminRoutes from './routes/adminRoutes';
import giftListRoutes, { giftListByEmailRouter } from './routes/giftListRoutes';

/**
 * Imagina o `app.ts` como a receção do nosso edifício. Aqui abrimos as portas,
 * instalamos os porteiros (middlewares) e mostramos a cada visitante para onde
 * ele deve ir. O Express funciona como o zelador dessa receção.
 */

const app = express();

// Estes são os "porteiros" padrão: CORS permite acessos externos controlados,
// o JSON decoder entende o corpo das requisições e o Morgan regista tudo no console.
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Pequeno raio-X do banco de dados: útil quando estamos a depurar a ligação.
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

// A ordem das rotas importa! Começamos pelas mais específicas para evitar
// conflitos com caminhos que usam parâmetros dinâmicos.
app.use('/api/participants/by-email', giftListByEmailRouter);
app.use('/api/participants/:participantId/gifts', giftListRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/admin', adminRoutes);

export default app;
