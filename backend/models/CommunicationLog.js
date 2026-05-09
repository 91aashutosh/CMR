const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommunicationLogSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
  },
  journeyId: {
    type: Schema.Types.ObjectId,
    ref: 'Journey',
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRIED'],
    default: 'SENT',
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'whatsapp'],
    default: 'email',
  },
  failureReason: {
    type: String,
    default: '',
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now,
  },
  deliveredAt: Date,
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CommunicationLog', CommunicationLogSchema);
