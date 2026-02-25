const router = require('express').Router();
const product = require('../controllers/product');

router.get('/list', product.list);
router.get('/:id', product.detail);
router.post('/', product.create);
router.post('/media', product.media);
router.put('/:id', product.update);
router.delete('/:id', product.remove);

module.exports = router;
