const express = require('express');
const router = express.Router();
const CommunicationLog = require('../models/CommunicationLog');
const Campaign = require('../models/campaigns');


router.post('/', async (req, res) => {
  const { message } = req.body;
  try {
    const newCamp = new Campaign({
      message
    })

    const data = await newCamp.save();

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
