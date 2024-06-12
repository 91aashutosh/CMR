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
  router.post('/getList', async (req, res) => {
    const { spends, visits, noVisitMonths } = req.body;
    const query = {};

    console.log(spends, visits, noVisitMonths)
    if (spends) {
      query.totalSpends = { $gte: spends };
    }

    if (visits) {
      query.visits = { $gte: visits };
    }

    if (noVisitMonths) {
      const date = new Date();
      date.setMonth(date.getMonth() - noVisitMonths);
      query.lastVisitDate = { $lte: date };
    }

    try {
      if(!spends && !visits && !noVisitMonths)
        {
          return res.json([]);  
        }  
      const customers = await Customer.find(query);
      console.log("customers", customers);
      res.json(customers);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  module.exports = router;
