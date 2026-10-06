import mongoose from 'mongoose';

export const GENDERS = ['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
export const CITIZEN_STATUS = ['PROFILE_PENDING', 'ACTIVE', 'SUSPENDED'];

const citizenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, unique: true, sparse: true },
    gender: { type: String, enum: GENDERS },
    dateOfBirth: { type: Date },
    wardNumber: { type: Number },
    status: { type: String, enum: CITIZEN_STATUS, default: 'PROFILE_PENDING' },
    emailVerifiedAt: Date,
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export const Citizen = mongoose.model('Citizen', citizenSchema);
