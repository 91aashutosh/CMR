const express = require('express');
const router = express.Router();
require('dotenv').config(); // Add this at the very top

const Campaign = require('../models/campaigns');
const Customer = require('../models/Customer');
const CommunicationLog = require('../models/CommunicationLog');

const TEMPORARY_FAILURES = ['NETWORK_TIMEOUT', 'DLR_PENDING', 'PROVIDER_RATE_LIMIT'];
const PERMANENT_FAILURES = ['INVALID_CONTACT', 'UNSUBSCRIBED'];

// Create new campaign
router.post('/', async (req, res) => {
  const {
    name,
    heading,
    message,
    media,
    retrySettings,
    forceSend,
    scheduledTime,
    segmentId
  } = req.body;

  try {
    const newCampaign = new Campaign({
      name,
      heading,
      message,
      media: normalizeMedia(media),
      retrySettings: {
        enabled: retrySettings?.enabled !== false,
        maxRetries: Number(retrySettings?.maxRetries || 2),
      },
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
      .populate('segmentId');
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

    await CommunicationLog.deleteMany({ campaignId: campaign._id });

    const sendPromises = customers.map(async (customer, index) => {
      try {
        const delivery = simulateDelivery(customer, index, 0);
        const log = new CommunicationLog({
          customerId: customer._id,
          campaignId: campaign._id,
          status: delivery.status,
          failureReason: delivery.failureReason,
          retryCount: 0,
          deliveredAt: delivery.status === 'DELIVERED' ? new Date() : undefined,
          metadata: {
            media: campaign.media,
            heading: campaign.heading,
          },
        });
        await log.save();
        return { success: delivery.status !== 'FAILED', customerId: customer._id, delivery };
      } catch (err) {
        console.error(`Failed to send to ${customer._id}:`, err);
        return { success: false, customerId: customer._id, error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);

    updateCampaignDeliveryStats(campaign, results.map(result => result.delivery));
    campaign.status = 'completed';
    campaign.lastSent = new Date();
    await campaign.save();

    res.json({
      success: true,
      campaign,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/retry-failed', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('segmentId');
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.retrySettings?.enabled === false) {
      return res.status(400).json({ error: 'Smart Retry is disabled for this campaign' });
    }

    const maxRetries = campaign.retrySettings?.maxRetries || 2;
    const failedLogs = await CommunicationLog.find({
      campaignId: campaign._id,
      status: 'FAILED',
      retryCount: { $lt: maxRetries },
      failureReason: { $in: TEMPORARY_FAILURES },
    }).populate('customerId');

    const retryResults = [];
    for (const log of failedLogs) {
      const nextRetryCount = log.retryCount + 1;
      const delivery = simulateDelivery(log.customerId, retryResults.length, nextRetryCount);
      log.status = delivery.status === 'FAILED' ? 'FAILED' : 'RETRIED';
      log.failureReason = delivery.status === 'FAILED' ? delivery.failureReason : '';
      log.retryCount = nextRetryCount;
      log.lastAttemptAt = new Date();
      log.deliveredAt = delivery.status === 'FAILED' ? undefined : new Date();
      await log.save();
      retryResults.push({ customerId: log.customerId._id, status: log.status, retryCount: log.retryCount });
    }

    await refreshCampaignStats(campaign);

    res.json({
      success: true,
      retried: retryResults.length,
      retryResults,
      campaign,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/delivery-logs', async (req, res) => {
  try {
    const logs = await CommunicationLog.find({ campaignId: req.params.id })
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(400).json({ error: err.message });
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

function normalizeMedia(media = {}) {
  return {
    type: media.type || 'none',
    title: media.title || '',
    url: media.url || '',
    altText: media.altText || '',
    caption: media.caption || '',
  };
}

function simulateDelivery(customer, index, retryCount) {
  const seed = String(customer?._id || customer?.email || index)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0) + retryCount;

  if (retryCount > 0 && seed % 5 !== 0) {
    return { status: 'DELIVERED', failureReason: '' };
  }

  if (seed % 11 === 0) {
    return { status: 'FAILED', failureReason: PERMANENT_FAILURES[seed % PERMANENT_FAILURES.length] };
  }

  if (seed % 4 === 0) {
    return { status: 'FAILED', failureReason: TEMPORARY_FAILURES[seed % TEMPORARY_FAILURES.length] };
  }

  return { status: 'DELIVERED', failureReason: '' };
}

function updateCampaignDeliveryStats(campaign, deliveries) {
  const total = deliveries.length;
  const failed = deliveries.filter(delivery => delivery?.status === 'FAILED').length;
  const delivered = total - failed;
  campaign.deliveryStats = {
    total,
    sent: total,
    delivered,
    failed,
    retried: campaign.deliveryStats?.retried || 0,
  };
  campaign.openRate = total ? Math.round((delivered / total) * 68) : 0;
  campaign.clickRate = total ? Math.round((delivered / total) * 24) : 0;
  campaign.conversionRate = total ? Math.round((delivered / total) * 9) : 0;
}

async function refreshCampaignStats(campaign) {
  const logs = await CommunicationLog.find({ campaignId: campaign._id });
  const total = logs.length;
  const delivered = logs.filter(log => ['DELIVERED', 'RETRIED', 'SENT'].includes(log.status)).length;
  const failed = logs.filter(log => log.status === 'FAILED').length;
  const retried = logs.filter(log => log.retryCount > 0).length;
  campaign.deliveryStats = {
    total,
    sent: total,
    delivered,
    failed,
    retried,
  };
  campaign.openRate = total ? Math.round((delivered / total) * 68) : 0;
  campaign.clickRate = total ? Math.round((delivered / total) * 24) : 0;
  campaign.conversionRate = total ? Math.round((delivered / total) * 9) : 0;
  await campaign.save();
}

module.exports = router;
