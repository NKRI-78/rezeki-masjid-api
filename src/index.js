const express = require('express');

const auth = require('./routes/auth');
const profile = require('./routes/profile');
const product = require('./routes/product');
const mosque = require('./routes/mosque');
const banner = require('./routes/banner');

const Route = express.Router();

Route.use('/api/v1/auth', auth);
Route.use('/api/v1/profile', profile);
Route.use('/api/v1/product', product);
Route.use('/api/v1/mosque', mosque);
Route.use('/api/v1/banner', banner);

module.exports = Route;
