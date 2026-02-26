const router = require('express').Router();
const order = require('../controllers/order');

const jwt = require('../middleware/jwt');

router.get('/list', jwt, order.list);
router.get('/:invoice', order.detail);
router.post('/courier-cost', order.courierCost);
router.put('/status/:type', order.updateStatus);
router.post('/', jwt, order.create);
router.post('/callback', order.callback);
router.delete('/:invoice', order.remove);

module.exports = router;
