import mongoose from 'mongoose';

const versionAppSchema = new mongoose.Schema({
  version: { type: String, required: true },
  forceUpdate: { type: Boolean, default: false },
  message: { type: String },
  platform: { type: String, enum: ['ios', 'android', 'all'], default: 'all' },
  active: { type: Boolean, default: true },
}, {
  timestamps: true,
});

const VersionApp = mongoose.model('VersionApp', versionAppSchema);

export default VersionApp;
