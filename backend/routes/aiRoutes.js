const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Customer = require('../models/Customer');
const Segment = require('../models/segments');

const dotenv  = require('dotenv').config();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


router.get('/suggest-segments', async (req, res) => {
  try {
    // 1. Get customer statistics
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          avgSpend: { $avg: "$totalSpends" },
          avgVisits: { $avg: "$visits" },
          maxSpend: { $max: "$totalSpends" },
          minSpend: { $min: "$totalSpends" },
          totalCustomers: { $sum: 1 },
          segmentsCount: { $sum: 1 } // Count of existing segments
        }
      }
    ]);

    if (!stats.length) {
      return res.json([]);
    }

    // 2. Get existing segment names to avoid duplicates
    const existingSegments = await Segment.find({}, 'name');
    const existingNames = existingSegments.map(s => s.name);

    const model = ai.getGenerativeModel({ model: "gemini-pro" });

    
    const prompt = `
    Analyze these e-commerce customer metrics and suggest 3-5 valuable marketing segments.
    Avoid these existing segment names: ${existingNames.join(', ') || 'none'}

    Customer Statistics:
    - Avg Lifetime Value: $${stats[0].avgSpend?.toFixed(2) || 0}
    - Avg Visits: ${stats[0].avgVisits?.toFixed(1) || 0}
    - Total Customers: ${stats[0].totalCustomers || 0}
    - Existing Segments: ${stats[0].segmentsCount || 0}

    For each suggestion provide:
    1. Creative, unique name (title case)
    2. 1-sentence description
    3. Filter criteria (minSpend, minVisits, inactivityMonths)
    4. Personalized offer recommendation

    Format as EXACT JSON array:
    [{
      "name": "Segment Name",
      "description": "...",
      "filters": { 
        "minSpend": number|null, 
        "minVisits": number|null,
        "inactivityMonths": number|null 
      },
      "offer": "Tailored offer description"
    }]`.trim();

    const result = await model.generateContent(prompt);

    const response = await result.response;
    let text = response.text();

    // Clean Gemini's response
    text = text.replace(/```json|```/g, '').trim();
    const suggestions = JSON.parse(text);

    res.json(suggestions);

  } catch (err) {
    console.error("AI suggestion error:", err);
    res.status(500).json({ 
      error: "Failed to generate suggestions",
      details: err.message 
    });
  }
});

module.exports = router;