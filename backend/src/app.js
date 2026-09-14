const { randomUUID } = require('node:crypto');

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');

const { env } = require('./config/env');
const { errorHandler } = require('./middleware/error-handler');
const { notFound } = require('./middleware/not-found');
const { healthRouter } = require('./routes/health.routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use((request, response, next) => {
    request.id = request.get('x-request-id') || randomUUID();
    response.set('x-request-id', request.id);
    next();
  });

  app.get('/', (_request, response) => {
    response.status(200).json({
      service: 'ar-safety-backend',
      version: '1.0.0',
      health: '/api/health',
    });
  });

  app.use('/api/health', healthRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
