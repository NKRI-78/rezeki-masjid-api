const router = require('express').Router();
const product = require('../controllers/product');

const jwt = require('../middlewares/jwt');

router.get('/list', product.list);
router.get('/:id', product.detail);
router.post('/', jwt, product.create);
router.post('/media', product.media);
router.put('/:id', jwt, product.update);
router.delete('/:id', jwt, product.remove);

module.exports = router;
