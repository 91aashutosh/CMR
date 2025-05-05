const express = require('express');
const router = express.Router();
const Campaign = require('../models/campaigns');
const Customer = require('../models/Customer');
const CommunicationLog = require('../models/CommunicationLog');
require('dotenv').config();
const twilio = require('twilio');
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_NUMBER,
      to: '+917042954671'
    });

    await client.messages
    .create({
      body: message,
      from: process.env.TWILIO_NUMBER,
      to: '+917042954671'
    })
    .then(message => console.log(message.sid))
    .catch(error => console.error(error));

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

router.post('/:id/send', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('segmentId');
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const customers = await Customer.find(buildSegmentQuery(campaign.segmentId.filter_conditions));

    const sendPromises = customers.map(async customer => {
      try {
        const log = new CommunicationLog({
          customerId: customer._id,
          campaignId: campaign._id,
          status: 'sent',
        });
        await log.save();
        return { success: true, customerId: customer._id };
      } catch (err) {
        console.error(`Failed to send to ${customer._id}:`, err);
        return { success: false, customerId: customer._id, error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);

    // Update campaign status
    campaign.status = 'completed';
    await campaign.save();

    res.json({
      success: true,
      campaign: campaign
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildSegmentQuery(conditions) {
  const query = {};
  if (conditions.minSpends) query.totalSpends = { $gte: conditions.minSpends };
  if (conditions.minVisits) query.visits = { $gte: conditions.minVisits };
  if (conditions.noVisitMonths) {
    const date = new Date();
    date.setMonth(date.getMonth() - conditions.noVisitMonths);
    query.lastVisitDate = { $lte: date };
  }
  return query;
}

module.exports = router;
