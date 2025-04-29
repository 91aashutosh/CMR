const express = require('express');
const router = express.Router();
const Campaign = require('../models/campaigns');

// Create new campaign
router.post('/', async (req, res) => {
  const {
    name,
    heading,
    message,
    forceSend,
    scheduledTime,
    segmentId
  } = req.body;

  try {
    const newCampaign = new Campaign({
      name,
      heading,
      message,
      forceSend,
      scheduledTime,
      segmentId
    });

    const campaign = await newCampaign.save();
    res.json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate('segmentId')
      .sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
