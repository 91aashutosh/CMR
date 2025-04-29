const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SegmentSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  filter_conditions: {
    minSpends: {
      type: Number,
      default: 0,
    },
    minVisits: {
      type: Number,
      default: 0,
    },
    noVisitMonths: {
      type: Number,
      default: 0,
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
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

SegmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Segment', SegmentSchema);
