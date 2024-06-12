const express = require('express');
const axios = require('axios');
const router = express.Router();
const CommunicationLog = require('../models/CommunicationLog');
const Customer = require('../models/Customer');

let BATCH_SIZE = 10;
const SUCCESS_RATE = 0.9;
let statusBatch = [];

router.post('/', async (req, res) => {
    const { customer, message, batchSize } = req.body;
    BATCH_SIZE = batchSize
    console.log("req.body", req.body);
    try {
      const newLog = new CommunicationLog({ customer, message });
      const savedLog = await newLog.save();
      const statusResponse = await axios.post('http://localhost:5000/api/communication-log/delivery', { logId: savedLog._id });
      savedLog.status = statusResponse.data.status;
      await savedLog.save();
  
      res.json(savedLog);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  // Predefined batch size and success ra
  
  // Initialize and shuffle the status batch
  function initializeStatusBatch() {
    statusBatch = Array(BATCH_SIZE)
      .fill('SENT', 0, Math.floor(BATCH_SIZE * SUCCESS_RATE))
      .fill('FAILED', Math.floor(BATCH_SIZE * SUCCESS_RATE));
    shuffle(statusBatch);
  }
  
  // Get vendor status from the batch
  function getVendorStatus() {
    if (statusBatch.length === 0) {
      initializeStatusBatch();
    }
    return statusBatch.pop();
  }
  
  // Initialize the status batch on server start
  initializeStatusBatch();
  
  // Define the delivery endpoint
  router.post('/delivery', (req, res) => {
    const status = getVendorStatus();
    res.json({ status });
  });
  
  module.exports = router;