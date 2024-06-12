const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

router.post('/check', async (req, res) => {
  const { spends, visits, noVisitMonths } = req.body;
  console.log(spends, visits, noVisitMonths)
  const query = {};

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
      return res.json({audienceSize: 0});  
    }  
    const customers = await Customer.find(query);
    console.log("customers", customers)
    res.json({audienceSize: customers.length});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
