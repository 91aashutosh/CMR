const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Customer = require('../models/Customer')

// Create a new order
router.post('/', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    const order = await newOrder.save();

    // Update customer's totalSpends and lastVisitDate
    await Customer.findByIdAndUpdate(req.body.customer, {
      $inc: { totalSpends: req.body.amount, visits: 1 },
      $set: { lastVisitDate: new Date() },
    });

    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
