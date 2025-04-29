const express = require('express');
const router = express.Router();
const CommunicationLog = require('../models/CommunicationLog');

router.post('/', async (req, res) => {
    const { customerId, campaignId } = req.body;
    try {
      const newLog = new CommunicationLog({ customerId, campaignId });
      const savedLog = await newLog.save();
      res.json(savedLog);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  
  module.exports = router;