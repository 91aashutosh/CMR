const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// Get audience size with filters
router.post('/check', async (req, res) => {
  const { conditions } = req.body;
  const query = { $and: conditions.map(condition => ({ [condition.field]: condition.value })) };

  try {
    const audienceSize = await Customer.countDocuments(query);
    res.json({ audienceSize });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
