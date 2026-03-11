const express = require('express');
const router = express.Router();

const banner = require('../controllers/banner');

const jwt = require('../middlewares/jwt');
const { requireAdmin } = require('../middlewares/role');

router.get('/list', banner.list);
router.get('/:id', banner.detail);
router.post('/', jwt, requireAdmin, banner.create);
router.put('/:id', jwt, requireAdmin, banner.update);
router.delete('/:id', jwt, requireAdmin, banner.remove);

module.exports = router;
