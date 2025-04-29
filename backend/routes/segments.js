const express = require('express');
const router = express.Router();
const Segment = require('../models/segments');
const Customer = require('../models/Customer');

// Create new segment
router.post('/', async (req, res) => {
  const {
    name,
    filter_conditions
  } = req.body;

  try {
    const newSegment = new Segment({
      name,
      filter_conditions
    });

    const segment = await newSegment.save();
    res.json(segment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all segments
router.get('/', async (req, res) => {
  try {
    const segments = await Segment.find()
      .sort({ createdAt: -1 });
    res.json(segments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get segment by ID
router.get('/:id', async (req, res) => {
  try {
    const segment = await Segment.findById(req.params.id)
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    res.json(segment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/customers/:segmentId', async (req, res) => {
  try {
    const segment = await Segment.findById(req.params.segmentId)
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const { minSpends, minVisits, noVisitMonths } = segment.filter_conditions;

    const query = {
      visits: { $gte: minVisits },
      totalSpends: { $gte: minSpends },
      noVisitMonths: { $gte: noVisitMonths }
    }

    const customers = await Customer.find(query);
    res.json(customers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/customersCount/:segmentId', async (req, res) => {
  try {
    const segment = await Segment.findById(req.params.segmentId)
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const { minSpends, minVisits, noVisitMonths } = segment.filter_conditions;

    const query = {
      visits: { $gte: minVisits },
      totalSpends: { $gte: minSpends },
      noVisitMonths: { $gte: noVisitMonths }
    }

    const customers = await Customer.countDocuments(query);
    res.json({ count: customers });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
