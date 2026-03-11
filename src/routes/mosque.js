const router = require('express').Router();
const mosque = require('../controllers/mosque');

const jwt = require('../middlewares/jwt');
const { requireAdmin } = require('../middlewares/role');

router.get('/list', mosque.list);
router.get('/:id', mosque.detail);
router.post('/', jwt, requireAdmin, mosque.create);
router.post('/assign-product', jwt, requireAdmin, mosque.assignProduct);
router.put('/toggle-product/:product_id/:mosque_id', jwt, requireAdmin, mosque.toggleProduct);
router.put('/:id', jwt, requireAdmin, mosque.update);
router.delete('/:id', jwt, requireAdmin, mosque.remove);

module.exports = router;
