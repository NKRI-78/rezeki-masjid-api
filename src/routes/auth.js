const express = require('express');
const Route = express.Router();
const auth = require('../controllers/auth');

Route.post('/login', auth.login).post('/register', auth.register);

module.exports = Route;
