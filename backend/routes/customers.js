const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');

// Create a new customer
router.post('/', async (req, res) => {
  try {
    const newCustomer = new Customer(req.body);
    const customer = await newCustomer.save();
    res.json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get customers with filters
router.get('/', async (req, res) => {
  const { spends, visits, noVisitMonths } = req.query;
  const query = {};

  if (spends) {
    query.totalSpends = { $gt: spends };
  }

  if (visits) {
    query.visits = { $eq: visits };
  }

  if (noVisitMonths) {
    const date = new Date();
    date.setMonth(date.getMonth() - noVisitMonths);
    query.lastVisitDate = { $lt: date };
  }

  try {
    const customers = await Customer.find(query);
    res.json(customers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
