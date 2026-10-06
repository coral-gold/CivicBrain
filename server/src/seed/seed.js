import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { Staff } from '../models/Staff.js';
import { Ward } from '../models/Ward.js';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/password.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Upserts the 5 demo wards (FR-M5). @returns {Promise<number>} wards in the collection */
export async function seedWards() {
  const geo = JSON.parse(fs.readFileSync(path.join(here, 'wards.geojson'), 'utf8'));
  for (const f of geo.features) {
    await Ward.updateOne({ number: f.properties.number }, { $set: { name: f.properties.name, boundary: f.geometry } }, { upsert: true });
  }
  await Ward.syncIndexes();
  return Ward.countDocuments();
}

/** Creates the first SUPER_ADMIN from env (FR-A13); never overwrites an existing account. */
export async function seedSuperAdmin() {
  const email = env.ADMIN_SEED_EMAIL.trim().toLowerCase();
  if (!email || !env.ADMIN_SEED_PASSWORD) return { created: false, reason: 'ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD not set' };
  if (!isStrongPassword(env.ADMIN_SEED_PASSWORD)) throw new Error(`ADMIN_SEED_PASSWORD is too weak. ${PASSWORD_POLICY_MESSAGE}`);
  if (await Staff.exists({ email })) return { created: false, reason: 'already exists' };
  await Staff.create({ email, fullName: 'Super Admin', role: 'SUPER_ADMIN', passwordHash: await bcrypt.hash(env.ADMIN_SEED_PASSWORD, 12) });
  return { created: true, email };
}

async function main() {
  await connectDb();
  const wards = await seedWards();
  const admin = await seedSuperAdmin();
  console.log(`Seed complete: ${wards} wards; super admin ${admin.created ? `created (${admin.email})` : `skipped (${admin.reason})`}.`);
  await disconnectDb();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async (e) => {
    console.error(`Seed failed: ${e.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}
