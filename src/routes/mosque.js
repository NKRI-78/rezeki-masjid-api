const router = require('express').Router();
const mosque = require('../controllers/mosque');

const jwt = require('../middlewares/jwt');

router.get('/list', mosque.list);
router.get('/:id', mosque.detail);
router.post('/', jwt, mosque.create);
router.post('/assign-product', jwt, mosque.assignProduct);
router.put('/toggle-product/:product_id/:mosque_id', jwt, mosque.toggleProduct);
router.put('/:id', jwt, mosque.update);
router.delete('/:id', jwt, mosque.remove);

module.exports = router;
