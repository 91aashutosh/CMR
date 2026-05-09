const express = require('express');
const router = express.Router();

const Journey = require('../models/Journey');
const Customer = require('../models/Customer');
const CommunicationLog = require('../models/CommunicationLog');
const Segment = require('../models/segments');

router.post('/', async (req, res) => {
  try {
    const journey = await Journey.create({
      name: req.body.name,
      type: req.body.type || 'birthday',
      segmentId: req.body.segmentId || undefined,
      channel: req.body.channel || 'push',
      status: req.body.status || 'active',
      trigger: req.body.trigger || { event: 'birthday', timeOfDay: '09:00' },
      template: {
        heading: req.body.template?.heading || req.body.heading,
        message: req.body.template?.message || req.body.message,
        media: req.body.template?.media || req.body.media || {},
      },
    });

    res.json(journey);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const journeys = await Journey.find()
      .populate('segmentId')
      .sort({ createdAt: -1 });
    res.json(journeys);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/run', async (req, res) => {
  try {
    const journey = await Journey.findById(req.params.id).populate('segmentId');
    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    if (journey.status !== 'active') {
      return res.status(400).json({ error: 'Journey is paused' });
    }

    const customers = await getJourneyCustomers(journey);
    const logs = await Promise.all(customers.map(customer => CommunicationLog.create({
      customerId: customer._id,
      journeyId: journey._id,
      status: 'DELIVERED',
      channel: journey.channel,
      deliveredAt: new Date(),
      metadata: {
        trigger: journey.trigger,
        heading: personalize(journey.template.heading, customer),
        message: personalize(journey.template.message, customer),
        media: journey.template.media,
      },
    })));

    journey.runStats.runs += 1;
    journey.runStats.sent += logs.length;
    journey.runStats.lastRunAt = new Date();
    await journey.save();

    res.json({ success: true, sent: logs.length, journey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function getJourneyCustomers(journey) {
  if (journey.segmentId?.filter_conditions) {
    return Customer.find(buildSegmentQuery(journey.segmentId.filter_conditions));
  }

  if (journey.type === 'birthday') {
    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();
    const candidates = await Customer.find({ birthDate: { $exists: true, $ne: null } }).limit(500);
    const birthdayCustomers = candidates
      .filter(customer => {
        const birthDate = new Date(customer.birthDate);
        return birthDate.getMonth() === month && birthDate.getDate() === day;
      })
      .slice(0, 50);

    if (birthdayCustomers.length) return birthdayCustomers;
  }

  return Customer.find().sort({ totalSpends: -1 }).limit(25);
}

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

function personalize(text = '', customer) {
  return text
    .replaceAll('{{name}}', customer.name || 'there')
    .replaceAll('{{firstName}}', (customer.name || 'there').split(' ')[0]);
}

module.exports = router;
