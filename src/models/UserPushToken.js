import mongoose from 'mongoose';

const userPushTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  expoPushToken: {
    type: String,
    required: true,
    unique: true, // Um token deve ser único
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web', 'unknown'],
    default: 'unknown',
  },
  deviceId: {
    type: String,
  },
}, {
  timestamps: true,
});

const UserPushToken = mongoose.model('UserPushToken', userPushTokenSchema);

export default UserPushToken;
