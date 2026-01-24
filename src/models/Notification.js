import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['motor_created', 'favorite_updated', 'maintenance_alert', 'admin_alert', 'general'],
    default: 'general',
    index: true,
  },
  data: {
    motorId: String,
    motorModelo: String,
    motorMarca: String,
    userId: String,
    userName: String,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  icon: String,
  imageUrl: String,
  actionUrl: String,
  expiresAt: Date,
}, {
  timestamps: true,
});

// Índices compostos
notificationSchema.index({ uid: 1, read: 1, createdAt: -1 });
notificationSchema.index({ uid: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export default mongoose.model('Notification', notificationSchema);
