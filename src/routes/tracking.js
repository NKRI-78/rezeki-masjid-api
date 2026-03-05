const router = require('express').Router();
const tracking = require('../controllers/tracking');
const jwt = require('../middlewares/jwt');

router.post('/jne', jwt, tracking.jne);

module.exports = router;
