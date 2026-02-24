const express = require('express');
const router = express.Router();

const banner = require('../controllers/banner');

router.get('/list', banner.list);
router.get('/:id', banner.detail);
router.post('/', banner.create);
router.put('/:id', banner.update);
router.delete('/:id', banner.remove);

module.exports = router;
