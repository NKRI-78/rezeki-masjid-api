const router = require('express').Router();
const mosque = require('../controllers/mosque');

router.get('/list', mosque.list);
router.get('/:id', mosque.detail);
router.post('/', mosque.create);
router.post('/assign-product', mosque.assignProduct);
router.put('/toggle-product/:product_id/:mosque_id', mosque.toggleProduct);
router.put('/:id', mosque.update);
router.delete('/:id', mosque.remove);

module.exports = router;
