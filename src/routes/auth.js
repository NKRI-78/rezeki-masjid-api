const express = require('express');
const Route = express.Router();
const auth = require('../controllers/auth');

Route.post('/login', auth.login)
  .post('/register', auth.register)
  .post('/verify-otp', auth.verifyOtp)
  .post('/resend-otp', auth.resendOtp)
  .post('/forgot-password', auth.forgotPassword)
  .post('/resend-forgot-otp', auth.resendForgotOtp)
  .post('/verify-forgot-otp', auth.verifyForgotOtp)
  .post('/change-password', auth.changePassword);

module.exports = Route;
