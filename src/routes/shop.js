const express = require('express');
const router = express.Router();

const shop = require('../controllers/shop');

router.get('/list', shop.list);
router.get('/:id', shop.detail);
router.post('/', shop.create);
router.put('/:id', shop.update);
router.delete('/:id', shop.delete);
router.patch('/:id/active', shop.setActive);

module.exports = router;
