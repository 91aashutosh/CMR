
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Customer = require('../models/Customer');
const dotenv  = require('dotenv').config({});
const openai = new OpenAI(process.env.OPENAI_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 

class AIService {
  static async analyzeCustomers() {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          avgSpend: { $avg: "$totalSpends" },
          avgVisits: { $avg: "$visits" },
          maxSpend: { $max: "$totalSpends" },
          minSpend: { $min: "$totalSpends" },
          totalCustomers: { $sum: 1 }
        }
      }
    ]);

    if (!stats.length) return [];
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    Analyze these e-commerce customer metrics and suggest marketing segments:
    
    Customer Statistics:
    - Average Lifetime Value: $${stats[0].avgSpend?.toFixed(2) || 0}
    - Average Visits: ${stats[0].avgVisits?.toFixed(1) || 0}
    - Total Customers: ${stats[0].totalCustomers || 0}
    
    Generate 3 segment suggestions with:
    1. Creative segment name
    2. 1-sentence description
    3. Filter criteria (minSpend, minVisits, inactivityMonths)
    4. Personalized offer recommendation
    
    Format as JSON array exactly like this:
    [
      {
        "name": "High Rollers",
        "description": "Top-spending customers who generate most revenue",
        "filters": { "minSpend": 500, "minVisits": 3 },
        "offer": "Exclusive VIP discount: 20% off + free shipping"
      }
    ]`.trim();

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean Gemini's markdown formatting
      const cleanJson = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error("Gemini API error:", err);
      return [];
    }
  }
}

module.exports = AIService;