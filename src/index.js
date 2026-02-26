const express = require('express');

const auth = require('./routes/auth');
const administration = require('./routes/administration');
const profile = require('./routes/profile');
const product = require('./routes/product');
const mosque = require('./routes/mosque');
const banner = require('./routes/banner');
const shop = require('./routes/shop');
const order = require('./routes/order');
const payment = require('./routes/payment');

const Route = express.Router();

Route.use('/api/v1/auth', auth);
Route.use('/api/v1/administration', administration);
Route.use('/api/v1/profile', profile);
Route.use('/api/v1/payment', payment);
Route.use('/api/v1/product', product);
Route.use('/api/v1/mosque', mosque);
Route.use('/api/v1/banner', banner);
Route.use('/api/v1/shop', shop);
Route.use('/api/v1/order', order);

module.exports = Route;
