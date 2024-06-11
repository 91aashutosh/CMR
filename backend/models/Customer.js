const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  visits: {
    type: Number,
    default: 0,
  },
  lastVisitDate: {
    type: Date,
    default: Date.now,
  },
  totalSpends: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Customer', CustomerSchema);
