import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import { config } from './config.js';
import { db } from './db/index.js';
import { SqliteSessionStore } from './db/sqliteSessionStore.js';
import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimit.js';

const isProduction = config.env === 'production';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());

  if (!isProduction) {
    app.use(
      cors({
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
      })
    );
  }

  app.use(express.json());
  app.use(
    session({
      store: new SqliteSessionStore(db),
      name: 'casafinance.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        // 'auto': usa HTTPS (cookie Secure) quando a requisição chega segura —
        // direto em dev/LAN (HTTP) ou atrás do proxy reverso com TLS em
        // produção na internet (ver `trust proxy` + X-Forwarded-Proto).
        secure: 'auto',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  if (!isProduction) {
    app.use(morgan('dev'));
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', env: config.env });
  });

  app.use('/api', apiRateLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/users', userRoutes);

  if (fs.existsSync(config.clientDistPath)) {
    app.use(express.static(config.clientDistPath));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(config.clientDistPath, 'index.html'));
    });
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
