const express = require('express');

const auth = require('./routes/auth');
const profile = require('./routes/profile');
const product = require('./routes/product');

const Route = express.Router();

Route.use('/api/v1/auth', auth);
Route.use('/api/v1/profile', profile);
Route.use('/api/v1/product', product);

module.exports = Route;
