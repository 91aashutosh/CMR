const express = require('express');
const router = express.Router();

const Customer = require('../models/Customer');
const Segment = require('../models/segments');

router.get('/suggest-segments', async (req, res) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          avgSpend: { $avg: '$totalSpends' },
          avgVisits: { $avg: '$visits' },
          maxSpend: { $max: '$totalSpends' },
          totalCustomers: { $sum: 1 },
        },
      },
    ]);

    const existingSegments = await Segment.find({}, 'name');
    const existingNames = new Set(existingSegments.map(segment => segment.name));
    const metrics = stats[0] || {};
    const suggestions = buildRuleBasedSuggestions(metrics)
      .filter(suggestion => !existingNames.has(suggestion.name))
      .slice(0, 5);

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to generate suggestions',
      details: err.message,
    });
  }
});

function buildRuleBasedSuggestions(metrics) {
  const avgSpend = Math.round(metrics.avgSpend || 250);
  const avgVisits = Math.max(1, Math.round(metrics.avgVisits || 2));
  const highSpend = Math.max(avgSpend * 2, Math.round(metrics.maxSpend || 1000));

  return [
    {
      name: 'Premium Loyalists',
      description: 'High-value customers who are likely to respond to exclusive offers.',
      filters: { minSpend: highSpend, minVisits: avgVisits, inactivityMonths: null },
      offer: 'VIP early access with a premium bundle incentive.',
    },
    {
      name: 'Repeat Purchase Ready',
      description: 'Customers with enough visit frequency to convert on a timely campaign.',
      filters: { minSpend: avgSpend, minVisits: avgVisits + 1, inactivityMonths: null },
      offer: 'Limited-time reward for their next purchase.',
    },
    {
      name: 'Win Back Audience',
      description: 'Customers who have not visited recently and may need a recovery offer.',
      filters: { minSpend: Math.max(50, Math.round(avgSpend / 2)), minVisits: 1, inactivityMonths: 3 },
      offer: 'Personalized comeback discount with urgency.',
    },
  ];
}

module.exports = router;
