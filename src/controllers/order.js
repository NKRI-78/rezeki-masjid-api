const moment = require('moment');
const misc = require('../helpers/response');
const Order = require('../models/Order');
const User = require('../models/User');
const { default: axios } = require('axios');
const { gramsToKg } = require('../helpers/utils');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const Mosque = require('../models/Mosque');

module.exports = {
  list: async (req, res) => {
    const userId = req.decoded.id;

    try {
      const { page = 1, limit = 10, search = '', status } = req.query;

      const rows = await Order.list({ page, limit, search, status, user_id: userId });

      var items = [];

      for (const i in rows.items) {
        const row = rows.items[i];

        const product = await Order.orderItem(row.id);
        const shop = await Shop.detail(row.shop_id);
        const mosque = await Mosque.detail(row.mosque_id);
        const user = await User.me(row.user_id);

        items.push({
          invoice: row.invoice,
          amount: row.amount,
          status: row.status,
          billing_no: row.billing_no,
          payment_method: row.payment_method,
          payment_code: row.payment_code,
          jne_service_code: row.jne_service_code,
          jne_price: row.jne_price,
          waybill: row.waybill,
          shop: shop,
          mosque: mosque,
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
      const shop = await Shop.detail(row.shop_id);
      const mosque = await Mosque.detail(row.mosque_id);
      const user = await User.me(row.user_id);

      misc.response(res, 200, false, 'OK', {
        invoice: row.invoice,
        amount: row.amount,
        qty: row.qty,
        status: row.status,
        billing_no: row.billing_no,
        payment_method: row.payment_method,
        payment_code: row.payment_code,
        jne_service_code: row.jne_service_code,
        jne_price: row.jne_price,
        waybill: row.waybill,
        shop: shop,
        mosque: mosque,
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
      const {
        items,
        amount,
        payment_code,
        payment_channel_id,
        mosque_id,
        jne_price,
        jne_service_code,
      } = req.body;

      const invoiceDate = moment().format('YYYYMMDD');

      const invoiceData = await Order.invoice(invoiceDate);

      var counterNumber = 1;

      if (invoiceData.length != 0) counterNumber = parseInt(invoiceData[0].no) + 1;

      const random = Math.floor(1000 + Math.random() * 9000);
      var invoiceValue = `RZKMSJD${invoiceDate}00${counterNumber}${random}`;

      var order = await Order.create({
        invoice: invoiceValue,
        no: counterNumber,
        jne_service_code: jne_service_code,
        jne_price: jne_price,
        date_value: invoiceDate,
        user_id: userId,
      });

      var qty = 0;
      var weight = 0;
      var shopId;

      for (const i in items) {
        var item = items[i];

        var product = await Product.detail(item.product_id);

        qty += parseInt(item.qty);
        weight += parseInt(product.weight);

        shopId = product.shop_id;

        await Order.createOrderItem({ invoice: order, product_id: item.product_id, qty: item.qty });
      }

      const payload = {
        channel_id: payment_channel_id,
        orderId: invoiceValue,
        amount: parseInt(amount),
        app: 'REZEKIMASJID',
        callbackUrl: process.env.CALLBACK,
      };

      const config = {
        method: 'POST',
        url: process.env.PAY_MIDTRANS,
        data: payload,
      };

      const result = await axios(config);

      var paymentAccess, paymentType, paymentExpire;

      if (['gopay'].includes(payment_code)) {
        paymentAccess = result.data.data.data.actions[0].url;
        paymentType = 'emoney';
        paymentExpire = moment()
          .tz('Asia/Jakarta')
          .add(30, 'minutes')
          .format('YYYY-MM-DD HH:mm:ss');
      } else {
        paymentAccess = result.data.data.data.vaNumber;
        paymentType = 'va';
        paymentExpire = result.data.data.expire;
      }

      const created = await Order.detail(invoiceValue);

      await Order.update({
        payment_method: paymentType,
        payment_code: payment_code,
        billing_no: paymentAccess,
        invoice: invoiceValue,
        product_qty: qty,
        product_weight: gramsToKg(weight),
        shop_id: shopId,
        mosque_id: mosque_id,
        amount: amount,
      });

      misc.response(res, 201, false, 'created', {
        invoice: created.invoice,
        payment_access: paymentAccess,
        payment_expire: paymentExpire,
        payment_type: paymentType,
        amount: amount,
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

        var product = await Product.detail(item.product_id);

        weight += Number(product.weight) * Number(item.qty);
      }

      const selectMosqueDistrict = await Order.selectMosqueDistrict(mosque_id);

      if (selectMosqueDistrict.length == 0) throw new Error('Alamat masjid belum lengkap');

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

  updateStatus: async (req, res) => {
    try {
      const { type } = req.params;
      const { invoice } = req.body;

      switch (type) {
        case 'PROCESS':
          break;
        case 'WAYBILL':
          const url = process.env.WAYBILL_JNE;

          const order = await Order.detail(invoice);

          const shop = await Shop.detail(order.shop_id);
          const mosque = await Mosque.detail(order.mosque_id);

          const orig = await Order.getTariffCode(shop.district);
          const dest = await Order.getTariffCode(mosque.district);

          const data = {
            username: process.env.USERNAME_JNE,
            api_key: process.env.KEY_API_JNE,

            OLSHOP_BRANCH: 'CGK000', // JAKARTA
            OLSHOP_CUST: '80580700',
            OLSHOP_ORDERID: 'test', // ini nya yang bener

            OLSHOP_SHIPPER_NAME: shop.name,
            OLSHOP_SHIPPER_ADDR1: 'jl', // shop.address
            OLSHOP_SHIPPER_ADDR2: 'jl', //shop.address
            OLSHOP_SHIPPER_ADDR3: '', // optional
            OLSHOP_SHIPPER_CITY: shop.city,
            OLSHOP_SHIPPER_REGION: '', // optional
            OLSHOP_SHIPPER_ZIP: shop.zip_code,
            OLSHOP_SHIPPER_PHONE: parseInt(shop.phone),

            OLSHOP_RECEIVER_NAME: mosque.name,
            OLSHOP_RECEIVER_ADDR1: 'jl', // mosque.detail_address
            OLSHOP_RECEIVER_ADDR2: 'jl', // mosque.detail_address
            OLSHOP_RECEIVER_ADDR3: '', // optional
            OLSHOP_RECEIVER_CITY: mosque.city,
            OLSHOP_RECEIVER_REGION: '', // optional
            OLSHOP_RECEIVER_ZIP: mosque.zip_code,
            OLSHOP_RECEIVER_PHONE: parseInt(mosque.phone),

            OLSHOP_QTY: order.product_qty,
            OLSHOP_WEIGHT: 1,
            OLSHOP_GOODSDESC: '-',
            OLSHOP_GOODSVALUE: 10000,
            OLSHOP_GOODSTYPE: 1,
            OLSHOP_INST: '-',
            OLSHOP_INS_FLAG: 'N',

            OLSHOP_ORIG: orig,
            OLSHOP_DEST: dest,
            OLSHOP_SERVICE: order.jne_service_code,

            OLSHOP_COD_FLAG: 'N',
            OLSHOP_COD_AMOUNT: '0',
          };

          const config = {
            method: 'POST',
            url: url,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: data,
          };

          console.log(config);

          const result = await axios(config);

          console.log(result.data);

        default:
          break;
      }

      misc.response(res, 200, false, 'OK');
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
