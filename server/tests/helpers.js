import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../src/app.js';
import { outbox } from '../src/mail/mailer.js';
import { Citizen } from '../src/models/Citizen.js';
import { Otp } from '../src/models/Otp.js';
import { Staff } from '../src/models/Staff.js';
import { seedWards } from '../src/seed/seed.js';

export const STRONG_PW = 'Str0ng!Passw0rd#';
let mem;
let ipCounter = 0;

export async function startDb() {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('civicbrain_test'));
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function stopDb() {
  await mongoose.disconnect();
  await mem?.stop();
}

/** Empties every collection and re-creates the 5 demo wards. */
export async function resetDb() {
  await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
  outbox.length = 0;
  await seedWards();
}

/** A supertest agent (keeps cookies) that pretends to be a fresh client IP, so rate limits never leak between tests. */
export function client() {
  const ip = `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter++ & 255}`;
  const a = request.agent(app);
  a.set('X-Forwarded-For', ip);
  a.ip = ip;
  return a;
}

/** Latest one-time code emailed to `email` (read from the test outbox). */
export function lastOtp(email) {
  const m = [...outbox].reverse().find((o) => o.to === email && o.meta?.type === 'OTP');
  return m?.meta.code;
}

export const mailsTo = (email) => outbox.filter((o) => o.to === email);

/** Moves all OTP rows into the past so the 60 s cooldown no longer applies. */
export const skipCooldown = () => Otp.updateMany({}, { createdAt: new Date(Date.now() - 5 * 60 * 1000) });

/** Signs up a citizen through the real API; returns the agent (logged in, profile pending). */
export async function signUp(c, email = 'asha@example.com', name = 'Asha Patil') {
  await c.post('/api/auth/signup/request-otp').send({ name, email }).expect(200);
  const res = await c
    .post('/api/auth/signup/verify')
    .send({ email, otp: lastOtp(email) })
    .expect(200);
  return res.body.user;
}

export const validProfile = (over = {}) => ({
  fullName: 'Asha Patil',
  phone: '9876543210',
  gender: 'FEMALE',
  dateOfBirth: '1995-04-12',
  wardNumber: 2,
  ...over,
});

export async function createActiveCitizen(email, phone = '9123456780') {
  return Citizen.create({ email, fullName: 'Active Citizen', phone, gender: 'MALE', dateOfBirth: new Date('1990-01-01'), wardNumber: 1, status: 'ACTIVE' });
}

export async function createStaff({ email = 'officer@example.com', role = 'OFFICER', assignedWard = 1, password = STRONG_PW, enabled = true } = {}) {
  return Staff.create({ email, fullName: `Staff ${role}`, role, assignedWard, enabled, passwordHash: await bcrypt.hash(password, 4) });
}

/** A cookie header value for an arbitrary user id/role signed with the real secret. */
export function cookieFor(sub, role = 'CITIZEN', secret = process.env.JWT_SECRET) {
  return `cb_session=${jwt.sign({ sub: String(sub), role, name: 'x', pc: true }, secret, { algorithm: 'HS256', expiresIn: 600 })}`;
}
