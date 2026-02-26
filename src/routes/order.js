const router = require('express').Router();
const order = require('../controllers/order');

const jwt = require('../middleware/jwt');

router.get('/list', order.list);
router.get('/:invoice', order.detail);
router.post('/', jwt, order.create);
router.delete('/:invoice', order.remove);

module.exports = router;
