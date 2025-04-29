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
    required: true,
  },
  status: {
    type: String,
    enum: ['SENT', 'FAILED'],
    default: 'SENT',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CommunicationLog', CommunicationLogSchema);
