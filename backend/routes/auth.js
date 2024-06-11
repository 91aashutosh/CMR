const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google'), (req, res) => {
  const token = jwt.sign({ id: req.user.id }, keys.jwtSecret);
  res.redirect(`/auth/success?token=${token}`);
});

router.get('/success', (req, res) => {
  res.send('Login successful');
});

module.exports = router;
