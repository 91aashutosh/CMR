// AI Service with real segmentation logic
class AISegmentService {
    constructor(customerData) {
        this.customers = this.preprocessData(customerData);
        this.segmentRules = this.getSegmentRules();
    }

    // Preprocess CSV data into usable format
    preprocessData(data) {
        return data.map(customer => ({
            id: customer.Id,
            name: customer['Full Name'],
            email: customer['Email Adress'],
            age: customer.age,
            gender: customer.gender,
            location: customer.Address,
            latitude: customer.Latitude,
            longitude: customer.Longitude,
            lastOrderDate: new Date(customer['Order Datetime']),
            orderStatus: customer['Order Status'],
            orderTotal: customer['Order Total'],
            items: customer.Items,
            totalSales: customer['Total sales'],
            orderCount: customer['Order Count'],
            rating: customer.Rating,
            monthsInactive: this.calculateMonthsInactive(new Date(customer['Order Datetime']))
        }));
    }

    calculateMonthsInactive(lastOrderDate) {
        const today = new Date();
        const diffTime = Math.abs(today - lastOrderDate);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    }

    // Define segmentation rules
    getSegmentRules() {
        return [
            {
                name: "High-Value Customers",
                description: "Customers with highest lifetime value",
                condition: customer => customer.totalSales > 5000,
                offer: "Exclusive VIP discount: 20% off your next order",
                priority: 1
            },
            {
                name: "At-Risk Customers",
                description: "Haven't purchased in last 3 months",
                condition: customer => customer.monthsInactive >= 3,
                offer: "We miss you! 15% off to welcome you back",
                priority: 2
            },
            {
                name: "Jeans Buyers",
                description: "Customers who frequently buy jeans",
                condition: customer => customer.items.includes('Jeans'),
                offer: "New jeans collection! 10% off all denim",
                priority: 3
            },
            {
                name: "Seasonal Shoppers",
                description: "Customers who buy seasonal items",
                condition: customer => 
                    customer.items.includes('Coat') || 
                    customer.items.includes('Sweater'),
                offer: "Seasonal clearance sale! Up to 30% off",
                priority: 4
            },
            {
                name: "Frequent Buyers",
                description: "Customers with many orders but lower spending",
                condition: customer => 
                    customer.orderCount > 5 && 
                    customer.totalSales < 1000,
                offer: "Loyalty reward: Free shipping on next order",
                priority: 5
            }
        ];
    }

    // Generate segments with predicted performance
    async generateSegments() {
        const segments = [];
        
        this.segmentRules.forEach(rule => {
            const matchingCustomers = this.customers.filter(rule.condition);
            
            if (matchingCustomers.length > 0) {
                // Calculate predicted open rate (simplified for demo)
                const predictedOpenRate = Math.min(
                    90, 
                    Math.max(
                        40, 
                        70 - (rule.priority * 5) + 
                        (matchingCustomers.length / 100)
                    )
                ).toFixed(0);

                segments.push({
                    name: rule.name,
                    description: rule.description,
                    filters: this.getFiltersForSegment(rule.name),
                    customerCount: matchingCustomers.length,
                    offerSuggestion: rule.offer,
                    predictedOpenRate: predictedOpenRate,
                    sampleCustomers: matchingCustomers.slice(0, 3)
                });
            }
        });

        // Sort by priority then by customer count
        return segments.sort((a, b) => {
            const priorityDiff = this.getPriority(a.name) - this.getPriority(b.name);
            return priorityDiff !== 0 ? priorityDiff : b.customerCount - a.customerCount;
        });
    }

    getFiltersForSegment(segmentName) {
        // Map segment names to filter conditions
        const filterMap = {
            "High-Value Customers": { totalSales: { $gte: 5000 } },
            "At-Risk Customers": { lastOrderDate: { $lte: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
            "Jeans Buyers": { items: { $regex: 'Jeans', $options: 'i' } },
            "Seasonal Shoppers": { 
                $or: [
                    { items: { $regex: 'Coat', $options: 'i' } },
                    { items: { $regex: 'Sweater', $options: 'i' } }
                ]
            },
            "Frequent Buyers": { 
                orderCount: { $gte: 5 },
                totalSales: { $lt: 1000 }
            }
        };
        
        return filterMap[segmentName] || {};
    }

    getPriority(segmentName) {
        return this.segmentRules.find(r => r.name === segmentName)?.priority || 5;
    }

    // Generate personalized offers for a customer
    generatePersonalizedOffers(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return [];

        const offers = [];
        
        // Check which segments the customer belongs to
        this.segmentRules.forEach(rule => {
            if (rule.condition(customer)) {
                offers.push({
                    segment: rule.name,
                    offer: rule.offer,
                    relevance: (100 - (rule.priority * 15)).toFixed(0) + '%'
                });
            }
        });

        // Add generic offers if no segments matched
        if (offers.length === 0) {
            offers.push({
                segment: "General Offer",
                offer: "Thank you for being a customer! 10% off your next order",
                relevance: "80%"
            });
        }

        return offers;
    }
}

// API Integration Functions
async function generateAISegmentRecommendations(customerData) {
    const aiService = new AISegmentService(customerData);
    return await aiService.generateSegments();
}

async function generatePersonalizedOffers(customerData, customerId) {
    const aiService = new AISegmentService(customerData);
    return aiService.generatePersonalizedOffers(customerId);
}

export { generateAISegmentRecommendations, generatePersonalizedOffers };