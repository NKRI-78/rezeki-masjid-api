const router = require('express').Router();
const product = require('../controllers/product');

const jwt = require('../middlewares/jwt');
const { requireAdmin } = require('../middlewares/role');

router.get('/list', product.list);
router.get('/:id', product.detail);
router.post('/', jwt, requireAdmin, product.create);
router.post('/media', product.media);
router.put('/:id', jwt, requireAdmin, product.update);
router.delete('/:id', jwt, requireAdmin, product.remove);

module.exports = router;
