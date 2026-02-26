const qs = require('qs');
const moment = require('moment');
const misc = require('../helpers/response');
const Order = require('../models/Order');
const User = require('../models/User');
const { default: axios } = require('axios');
const { kgToGrams, gramsToKg } = require('../helpers/utils');

module.exports = {
  list: async (req, res) => {
    const userId = req.decoded.id;

    try {
      const { page = 1, limit = 10, search = '', status } = req.query;

      const rows = await Order.list({ page, limit, search, status, user_id: userId });

      var items = [];

      for (const i in rows.items) {
        var row = rows.items[i];

        var product = await Order.orderItem(row.id);
        var user = await User.me(row.user_id);

        items.push({
          invoice: row.invoice,
          amount: row.amount,
          status: row.status,
          products: product,
          user: {
            id: user.id,
            avatar: user.avatar,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            role: user.role == 1 ? 'admin' : 'user',
          },
        });
      }

      misc.response(res, 200, false, 'OK', {
        items,
        page: rows.page,
        limit: rows.limit,
        total: rows.total,
        total_pages: rows.total_pages,
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  callback: async (req, res) => {
    try {
      const { order_id, status } = req.body;
      if (status == 'PAID') {
        await Order.updatePayment(order_id, status);
      }

      misc.response(res, 200, false, 'Callback called');
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  detail: async (req, res) => {
    try {
      const { invoice } = req.params;

      if (!invoice) return misc.response(res, 400, true, 'invoice is required');

      const row = await Order.detail(invoice);
      if (!row) return misc.response(res, 404, true, 'order not found');

      const product = await Order.orderItem(row.id);
      const user = await User.me(row.user_id);

      misc.response(res, 200, false, 'OK', {
        invoice: row.invoice,
        amount: row.amount,
        qty: row.qty,
        status: row.status,
        products: product,
        user: {
          id: user.id,
          avatar: user.avatar,
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          role: user.role == 1 ? 'admin' : 'user',
        },
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  create: async (req, res) => {
    const userId = req.decoded.id;

    try {
      const { items, channel_id, amount } = req.body;

      const invoiceDate = moment().format('YYYYMMDD');

      const invoiceData = await Order.invoice(invoiceDate);

      var counterNumber = 1;

      if (invoiceData.length != 0) counterNumber = parseInt(invoiceData[0].no) + 1;

      var invoiceValue = `RZKMSJD${invoiceDate}-00000${counterNumber}`;

      var order = await Order.create({
        invoice: invoiceValue,
        no: counterNumber,
        date_value: invoiceDate,
        amount: amount,
        user_id: userId,
      });

      for (const i in items) {
        var item = items[i];

        await Order.createOrderItem({ invoice: order, product_id: item.product_id, qty: item.qty });
      }

      const payload = {
        channel_id: channel_id,
        orderId: invoiceValue,
        amount: amount,
        app: 'REZEKI MASJID',
        callbackUrl: process.env.CALLBACK,
      };

      const config = {
        method: 'POST',
        url: process.env.PAY_MIDTRANS,
        data: payload,
      };

      const created = await Order.detail(invoiceValue);

      misc.response(res, 201, false, 'created', {
        invoice: created.invoice,
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  courierCost: async (req, res) => {
    try {
      const { mosque_id, items } = req.body;

      var weight = 0;

      for (const i in items) {
        var item = items[i];
        weight += parseInt(item.weight);
      }

      const selectMosqueDistrict = await Order.selectMosqueDistrict(mosque_id);

      const destinationTariffCode = await Order.getTariffCode(selectMosqueDistrict[0].district);

      const body = new URLSearchParams({
        username: process.env.USERNAME_JNE,
        api_key: process.env.KEY_API_JNE,
        from: 'CGK10000', // JAKARTA
        thru: destinationTariffCode,
        weight: gramsToKg(weight),
      }).toString();

      const config = {
        method: 'POST',
        url: process.env.CHECK_COST_JNE,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': 'RZKMSJD/1.x',
        },
        data: body,
      };

      const result = await axios(config);

      misc.response(res, 200, false, 'OK', result.data.price);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  remove: async (req, res) => {
    try {
      const { invoice } = req.params;

      if (!invoice) return misc.response(res, 400, true, 'invoice is required');

      const exists = await Order.detail(invoice);
      if (!exists) return misc.response(res, 404, true, 'order not found');

      await Order.remove(invoice);

      misc.response(res, 200, false, 'deleted', { invoice });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
