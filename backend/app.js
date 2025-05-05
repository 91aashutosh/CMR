const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const keys = require('./config/keys');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const audienceRoutes = require('./routes/audience');
const campaignRoutes = require('./routes/campaigns');
const CommunicationLogRoutes = require('./routes/communicationLog')
const segmentRoutes = require('./routes/segments');
const aiRoutes = require('./routes/aiRoutes')
const cors = require('cors');
const dotenv = require('dotenv').config();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

mongoose.connect("mongodb+srv://aashu2348154:Aashu123@cluster0.uanyjgk.mongodb.net/CMR?retryWrites=true&w=majority&appName=Cluster0", { useNewUrlParser: true, useUnifiedTopology: true });

// Passport middleware
// app.use(passport.initialize());
// require('./config/passport');

app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/communication-log', CommunicationLogRoutes);
// app.use('/auth', authRoutes);
app.use('/api/audience', audienceRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/ai', aiRoutes);

module.exports = app;
