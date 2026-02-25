const express = require('express');
const Route = express.Router();
const payment = require('../controllers/payment');

Route.get('/list', jwt, payment.me);

module.exports = Route;
