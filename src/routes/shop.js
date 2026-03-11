const express = require('express');
const router = express.Router();

const shop = require('../controllers/shop');

const jwt = require('../middlewares/jwt');

router.get('/list', shop.list);
router.get('/:id', shop.detail);
router.post('/', jwt, shop.create);
router.put('/:id', jwt, shop.update);
router.delete('/:id', jwt, shop.delete);
router.patch('/:id/active', jwt, shop.setActive);

module.exports = router;
