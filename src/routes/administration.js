const express = require('express');
const Route = express.Router();
const administration = require('../controllers/administration');

Route.get('/province', administration.province)
  .get('/city/:province_name', administration.city)
  .get('/district/:city_name', administration.district)
  .get('/subdistrict/:district_name', administration.subdistrict);

module.exports = Route;
