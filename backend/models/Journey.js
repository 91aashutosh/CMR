const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JourneySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['birthday', 'anniversary', 'inactive_customer', 'custom'],
    default: 'birthday',
  },
  segmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Segment',
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'whatsapp'],
    default: 'push',
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active',
  },
  trigger: {
    event: {
      type: String,
      default: 'birthday',
    },
    timeOfDay: {
      type: String,
      default: '09:00',
    },
  },
  template: {
    heading: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    media: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  runStats: {
    runs: {
      type: Number,
      default: 0,
    },
    sent: {
      type: Number,
      default: 0,
    },
    lastRunAt: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

JourneySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Journey', JourneySchema);
