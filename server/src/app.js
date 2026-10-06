import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import { rejectMongoOperators, requireJsonOrMultipart } from './middleware/security.js';
import authRoutes from './modules/auth/auth.routes.js';
import citizenRoutes from './modules/citizen/citizen.routes.js';
import publicRoutes from './modules/public.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

/** Builds the Express app (no listening, no DB connection – index.js and the tests do that). */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'img-src': ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'connect-src': ["'self'", 'https://nominatim.openstreetmap.org'],
        },
      },
    }),
  );
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use('/api', requireJsonOrMultipart);
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', rejectMongoOperators);

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/public', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/citizen', citizenRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api', notFound);

  // Production: Express also serves the built React app (single deployable).
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

export const app = createApp();
