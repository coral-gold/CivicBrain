import mongoose from 'mongoose';

export const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OFFICER'];

const staffSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: STAFF_ROLES, required: true },
    assignedWard: { type: Number },
    enabled: { type: Boolean, default: true },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export const Staff = mongoose.model('Staff', staffSchema);
