import mongoose from 'mongoose';

const wardSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  boundary: {
    type: { type: String, enum: ['Polygon', 'MultiPolygon'], required: true },
    coordinates: { type: [], required: true },
  },
});
wardSchema.index({ boundary: '2dsphere' });

export const Ward = mongoose.model('Ward', wardSchema);
