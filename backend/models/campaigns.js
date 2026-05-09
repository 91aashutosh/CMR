const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CampaignSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  heading: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  media: {
    type: {
      type: String,
      enum: ['none', 'image', 'banner', 'creative'],
      default: 'none',
    },
    title: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '',
    },
    altText: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      default: '',
    },
  },
  retrySettings: {
    enabled: {
      type: Boolean,
      default: true,
    },
    maxRetries: {
      type: Number,
      default: 2,
    },
  },
  deliveryStats: {
    total: {
      type: Number,
      default: 0,
    },
    sent: {
      type: Number,
      default: 0,
    },
    delivered: {
      type: Number,
      default: 0,
    },
    failed: {
      type: Number,
      default: 0,
    },
    retried: {
      type: Number,
      default: 0,
    },
  },
  openRate: {
    type: Number,
    default: 0,
  },
  clickRate: {
    type: Number,
    default: 0,
  },
  conversionRate: {
    type: Number,
    default: 0,
  },
  lastSent: Date,
  forceSend: {
    type: Boolean,
    default: false,
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  segmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Segment',
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'processing', 'completed', 'failed'],
    default: 'scheduled',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

CampaignSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Campaign', CampaignSchema);
