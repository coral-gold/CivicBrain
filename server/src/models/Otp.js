import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  purpose: { type: String, enum: ['SIGNUP', 'LOGIN'], required: true },
  codeHash: { type: String, required: true }, // HMAC-SHA256 – the code itself is never stored
  payload: { name: String },
  attempts: { type: Number, default: 0 },
  consumed: { type: Boolean, default: false }, // used, superseded, or a "decoy" row for unknown emails
  expiresAt: { type: Date, required: true },
  ip: String,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }, // TTL: purge after 24 h
});

export const Otp = mongoose.model('Otp', otpSchema);
