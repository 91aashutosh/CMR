const Customer = require('../models/Customer');

class AIService {
  static async analyzeCustomers() {
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

    if (!stats.length) return [];

    const metrics = stats[0];
    const avgSpend = Math.round(metrics.avgSpend || 250);
    const avgVisits = Math.max(1, Math.round(metrics.avgVisits || 2));

    return [
      {
        name: 'High Rollers',
        description: 'Top-spending customers who generate meaningful revenue.',
        filters: { minSpend: Math.max(avgSpend * 2, metrics.maxSpend || 500), minVisits: avgVisits },
        offer: 'Exclusive VIP discount with free shipping.',
      },
      {
        name: 'Frequent Visitors',
        description: 'Customers who return often and are ready for a timely offer.',
        filters: { minSpend: avgSpend, minVisits: avgVisits + 1 },
        offer: 'Limited-time reward on the next order.',
      },
      {
        name: 'Reactivation Targets',
        description: 'Customers who need a nudge to come back.',
        filters: { minSpend: Math.max(50, Math.round(avgSpend / 2)), minVisits: 1, inactivityMonths: 3 },
        offer: 'Comeback offer with a clear expiry date.',
      },
    ];
  }
}

module.exports = AIService;
