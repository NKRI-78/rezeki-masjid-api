const express = require('express');
const router = express.Router();

const banner = require('../controllers/banner');

const jwt = require('../middlewares/jwt');

router.get('/list', banner.list);
router.get('/:id', banner.detail);
router.post('/', jwt, banner.create);
router.put('/:id', jwt, banner.update);
router.delete('/:id', jwt, banner.remove);

module.exports = router;
