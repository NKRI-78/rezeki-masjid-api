const express = require('express');
const Route = express.Router();
const payment = require('../controllers/payment');

Route.get('/list', payment.list);

module.exports = Route;
