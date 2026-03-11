const express = require('express');
const Route = express.Router();
const payment = require('../controllers/payment');

const jwt = require('../middlewares/jwt');

Route.get('/list', jwt, payment.list);

module.exports = Route;
