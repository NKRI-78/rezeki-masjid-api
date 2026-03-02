const express = require('express');
const Route = express.Router();
const profile = require('../controllers/profile');

const jwt = require('../middlewares/jwt');

Route.get('/me', jwt, profile.me);

module.exports = Route;
