import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  actorType: { type: String, enum: ['CITIZEN', 'STAFF', 'ANONYMOUS'], default: 'ANONYMOUS' },
  email: String,
  event: { type: String, required: true, index: true },
  success: { type: Boolean, default: true },
  ip: String,
  userAgent: String,
  createdAt: { type: Date, default: Date.now, index: true },
});

export const AuditLog = mongoose.model('AuditLog', auditSchema);
