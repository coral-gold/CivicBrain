/**
 * Entry point. Environment is validated first (secrets must exist and be strong) so a bad configuration
 * fails with a readable message instead of a stack trace.
 */
let env, app, connectDb, disconnectDb, logger;
try {
  ({ env } = await import('./config/env.js'));
  ({ app } = await import('./app.js'));
  ({ connectDb, disconnectDb } = await import('./config/db.js'));
  ({ logger } = await import('./utils/logger.js'));
} catch (e) {
  console.error(`\n${e.message}\n`);
  process.exit(1);
}

try {
  await connectDb();
} catch (e) {
  logger.error({ error: e?.message }, 'Could not connect to MongoDB');
  process.exit(1);
}

const server = app.listen(env.PORT, () => logger.info(`CivicBrain API listening on http://localhost:${env.PORT}`));

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  logger.info(`${signal} received, shutting down`);
  server.close();
  await disconnectDb(); // in memory mode this flushes the data files
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
