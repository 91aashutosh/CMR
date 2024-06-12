const express = require('express');
const router = express.Router();
const CommunicationLog = require('../models/CommunicationLog');
const Campaign = require('../models/campaigns');
// const kafkaProducer = require('../kafka/producer');

// // Create a new campaign
// router.post('/', async (req, res) => {
//   const { customers, message } = req.body;

//   try {
//     const logs = await CommunicationLog.insertMany(customers.map(customer => ({
//       customer: customer._id,
//       message,
//     })));

//     // logs.forEach(log => kafkaProducer.send([{ topic: 'send-message', messages: JSON.stringify(log) }]));

//     res.json(logs);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

router.post('/', async (req, res) => {
  const { message } = req.body;
  try {
    const newCamp = new Campaign({
      message
    })

    const data = await newCamp.save();
    // logs.forEach(log => kafkaProducer.send([{ topic: 'send-message', messages: JSON.stringify(log) }]));

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
