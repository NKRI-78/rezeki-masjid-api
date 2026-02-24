const express = require('express');
const Route = express.Router();
const profile = require('../controllers/profile');

const jwt = require('../middleware/jwt');

Route.get('/me', jwt, profile.me);

module.exports = Route;
