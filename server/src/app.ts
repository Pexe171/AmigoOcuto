import express from 'express';
import cors from 'cors';
import participantRoutes from './routes/participantRoutes';
import adminRoutes from './routes/adminRoutes';
import giftListRoutes from './routes/giftListRoutes';
import eventRoutes from './routes/eventRoutes';
import { logger } from './observability/logger';
import { requestMetrics } from './middlewares/requestMetrics';
import { rateLimiter } from './middlewares/rateLimiter';
import { securityHeaders } from './middlewares/securityHeaders';
import { exportMetrics, metricsEnabled } from './observability/metrics';
import { cookieParser } from './middlewares/cookieParser';

const app = express();

// Ordem importa: primeiro endurecemos os cabeçalhos, depois liberamos CORS e, em seguida,
// habilitamos JSON/cookies/limites. Assim cada requisição recebe a mesma experiência
// humana e segura em qualquer rota.
app.use(securityHeaders);
app.use(cors());
app.use(express.json());
app.use(cookieParser);
app.use(rateLimiter);
app.use(requestMetrics);
app.use((req, res, next) => {
  const start = Date.now();
  logger.info({ event: 'http:incoming', method: req.method, path: req.path }, 'Requisição recebida');
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      { event: 'http:completed', method: req.method, path: req.path, statusCode: res.statusCode, durationMs: duration },
      'Requisição concluída',
    );
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/metrics', (_req, res) => {
  if (!metricsEnabled) {
    res.status(404).json({ message: 'Métricas desativadas' });
    return;
  }

  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(exportMetrics());
});

// Rotas mais específicas primeiro
app.use('/api/gift-lists', giftListRoutes); // Changed base path
app.use('/api/events', eventRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/admin', adminRoutes);

export default app;
