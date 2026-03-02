const router = require('express').Router();
const order = require('../controllers/order');

const jwt = require('../middlewares/jwt');

router.get('/list', jwt, order.list);
router.get('/:invoice', order.detail);
router.get('/:invoice/receipt.png', order.receiptPng);
router.post('/courier-cost', order.courierCost);
router.put('/status/:type', order.updateStatus);
router.post('/', jwt, order.create);
router.delete('/:invoice', order.remove);

module.exports = router;
