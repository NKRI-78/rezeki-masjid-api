const express = require('express');
const router = express.Router();

const shop = require('../controllers/shop');

const jwt = require('../middlewares/jwt');
const { requireAdmin } = require('../middlewares/role');

router.get('/list', shop.list);
router.get('/:id', shop.detail);
router.post('/', jwt, requireAdmin, shop.create);
router.put('/:id', jwt, requireAdmin, shop.update);
router.delete('/:id', jwt, requireAdmin, shop.delete);
router.patch('/:id/active', jwt, requireAdmin, shop.setActive);

module.exports = router;
