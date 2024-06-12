const express = require('express');
const axios = require('axios');
const router = express.Router();
const CommunicationLog = require('../models/CommunicationLog');
const Customer = require('../models/Customer');

router.post('/', async (req, res) => {
    const { customer, message } = req.body;
    console.log("req.body", req.body);
    try {
      const newLog = new CommunicationLog({ customer, message });
      const savedLog = await newLog.save();
      const statusResponse = await axios.post('http://localhost:5000/api/communication-log/deleivery', { logId: savedLog._id });
      savedLog.status = statusResponse.data.status;
      await savedLog.save();
  
      res.json(savedLog);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  
  let sentCount = 0;
  let failedCount = 0;
  
  function getVendorStatus() {
    const totalCount = sentCount + failedCount;
    if (totalCount === 0) {
      return 'SENT';
    }
  
    const successRate = sentCount / totalCount;
    if (successRate < 0.9) {
      sentCount++;
      return 'SENT';
    } else {
      failedCount++;
      return 'FAILED';
    }
  }

router.post('/deleivery', (req, res) => {
    const status = getVendorStatus();
    res.json({ status });
  });
  
  module.exports = router;