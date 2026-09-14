const { createApp } = require('./app');
const { closeDatabase } = require('./config/database');
const { env } = require('./config/env');

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`AR safety backend listening on port ${env.port}`);
});

async function shutDown(signal) {
  console.log(`${signal} received; shutting down`);

  server.close(async () => {
    try {
      await closeDatabase();
      process.exit(0);
    } catch (error) {
      console.error('Shutdown failed', error);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutDown('SIGINT'));
process.on('SIGTERM', () => shutDown('SIGTERM'));
