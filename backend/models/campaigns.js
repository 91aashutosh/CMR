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
