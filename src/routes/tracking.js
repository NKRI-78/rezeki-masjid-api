const router = require('express').Router();
const tracking = require('../controllers/tracking');

router.post('/jne', tracking.jne);

module.exports = router;
