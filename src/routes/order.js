const router = require('express').Router();
const order = require('../controllers/order');

const jwt = require('../middlewares/jwt');
const { requireAdmin } = require('../middlewares/role');

router.get('/list', jwt, order.list);
router.get('/:invoice', order.detail);
router.get('/:invoice/receipt.png', order.receiptPng);
router.post('/courier-cost', order.courierCost);
router.put('/status/:type', jwt, requireAdmin, order.updateStatus);
router.post('/', jwt, order.create);
router.delete('/:invoice', jwt, requireAdmin, order.remove);

module.exports = router;
