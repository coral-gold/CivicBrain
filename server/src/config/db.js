import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let memory = null;
const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.data/mongo');

/**
 * Connects Mongoose. With MONGO_URI=memory (development only) an in-process MongoDB is started and its
 * files are kept in server/.data so seeded data survives restarts.
 * @param {string} [uri]
 */
export async function connectDb(uri = env.MONGO_URI) {
  mongoose.set('strictQuery', true);
  let target = uri;
  if (uri === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    memory = await MongoMemoryServer.create({ instance: { dbPath: DATA_DIR, storageEngine: 'wiredTiger' } });
    target = memory.getUri('civicbrain');
    logger.info('Using in-process MongoDB (data in server/.data)');
  }
  await mongoose.connect(target, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memory) {
    await memory.stop({ doCleanup: false }); // keep the data files
    memory = null;
  }
}
