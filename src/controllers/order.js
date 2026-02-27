const moment = require('moment');
const misc = require('../helpers/response');
const Order = require('../models/Order');
const User = require('../models/User');
const { default: axios } = require('axios');
const { gramsToKg } = require('../helpers/utils');
const { generateReceiptPng } = require('../helpers/receipt_image');
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
          receipt: row.receipt,
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
        receipt: row.receipt,
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

      if (items.length == 0) throw new Error('items tidak boleh kosong');

      if (typeof amount == 'undefined' || amount == '') throw new Error('amount wajib diisi');

      if (typeof payment_code == 'undefined' || payment_code == '')
        throw new Error('payment_code wajib diisi');

      if (typeof payment_channel_id == 'undefined' || payment_channel_id == '')
        throw new Error('payment_channel_id wajib diisi');

      if (typeof mosque_id == 'undefined' || mosque_id == '')
        throw new Error('mosque_id wajib diisi');

      if (typeof jne_price == 'undefined' || jne_price == '')
        throw new Error('jne_price wajib diisi');

      if (typeof jne_service_code == 'undefined' || jne_service_code == '')
        throw new Error('jne_service_code wajib diisi');

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

      if (typeof mosque_id === 'undefined' || mosque_id === '')
        throw new Error('mosque_id wajib diisi');

      if (!Array.isArray(items) || items.length === 0) throw new Error('items tidak boleh kosong');

      let weight = 0; // total gram

      for (const i in items) {
        const item = items[i];

        const product = await Product.detail(item.product_id);
        weight += Number(product.weight) * Number(item.qty);
      }

      const selectMosqueDistrict = await Order.selectMosqueDistrict(mosque_id);
      if (selectMosqueDistrict.length === 0) throw new Error('Alamat masjid belum lengkap');

      const destinationTariffCode = await Order.getTariffCode(selectMosqueDistrict[0].district);

      const weightKg = gramsToKg(weight); // pastikan return number (kg)

      const body = new URLSearchParams({
        username: process.env.USERNAME_JNE,
        api_key: process.env.KEY_API_JNE,
        from: 'CGK10000', // JAKARTA
        thru: destinationTariffCode,
        weight: weightKg,
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

      // ---------------------------
      // HELPERS: SERVICE NAME MAP
      // ---------------------------
      const getServiceFullName = (serviceDisplay) => {
        const code = String(serviceDisplay || '').toUpperCase();

        // CTC variants
        if (code.startsWith('CTCYES')) {
          return 'City Transshipment Center - Yakin Esok Sampai (Next Day)';
        }
        if (code.startsWith('CTCSPS')) {
          return 'City Transshipment Center - Super Speed';
        }
        if (code.startsWith('CTC')) {
          return 'City Transshipment Center';
        }

        // JTR variants (JTR, JTR<130, JTR>130, dst)
        if (code.includes('JTR')) {
          return 'JTR (JNE Trucking - Minimum 10 Kg)';
        }

        return serviceDisplay; // fallback
      };

      // ---------------------------
      // FILTER + SORT + ENRICH
      // ---------------------------
      let prices = Array.isArray(result?.data?.price) ? result.data.price : [];

      // tampilkan JTR hanya jika >= 10kg
      if (Number(weightKg) < 10) {
        prices = prices.filter((r) => {
          const display = String(r.service_display || '').toUpperCase();
          const code = String(r.service_code || '').toUpperCase();
          return !display.includes('JTR') && !code.includes('JTR');
        });
      }

      // sort termurah di atas
      prices.sort((a, b) => Number(a.price) - Number(b.price));

      // tambahkan nama panjang
      prices = prices.map((r) => ({
        service_name: getServiceFullName(r.service_display),
        ...r,
      }));

      // response
      misc.response(res, 200, false, 'OK', {
        weight_gram: weight,
        weight_kg: Number(weightKg),
        items: prices,
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { type } = req.params;
      const { invoice } = req.body;

      if (typeof invoice == 'undefined' || invoice == '') throw new Error('invoice wajib diisi');

      var waybill;
      var receipt;

      switch (type) {
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
            OLSHOP_ORDERID: order.id,

            OLSHOP_SHIPPER_NAME: shop.name,
            OLSHOP_SHIPPER_ADDR1: shop.address,
            OLSHOP_SHIPPER_ADDR2: shop.address,
            OLSHOP_SHIPPER_ADDR3: '', // optional
            OLSHOP_SHIPPER_CITY: shop.city,
            OLSHOP_SHIPPER_REGION: '', // optional
            OLSHOP_SHIPPER_ZIP: shop.zip_code,
            OLSHOP_SHIPPER_PHONE: parseInt(shop.phone),

            OLSHOP_RECEIVER_NAME: mosque.name,
            OLSHOP_RECEIVER_ADDR1: mosque.detail_address,
            OLSHOP_RECEIVER_ADDR2: mosque.detail_address,
            OLSHOP_RECEIVER_ADDR3: '', // optional
            OLSHOP_RECEIVER_CITY: mosque.city,
            OLSHOP_RECEIVER_REGION: '', // optional
            OLSHOP_RECEIVER_ZIP: mosque.zip_code,
            OLSHOP_RECEIVER_PHONE: parseInt(mosque.phone),

            OLSHOP_QTY: order.product_qty,
            OLSHOP_WEIGHT: order.product_weight,
            OLSHOP_GOODSDESC: '-',
            OLSHOP_GOODSVALUE: parseInt(order.amount),
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

          const result = await axios(config);

          if (result.data.detail.length != 0) {
            if (result.data.detail[0].status.toLowerCase() == 'error') {
              if (result.data.detail[0].cnote_no == null) {
                throw new Error(
                  `${result.data.detail[0].reason} - ${result.data.detail[0].cnote_no}`,
                );
              }
            }
          }

          waybill = result.data.detail[0].cnote_no;
          receipt = `${process.env.BASE_URL}/api/v1/order/${invoice}/receipt.png`;

          await Order.orderUpdateWaybill(waybill, receipt, invoice);

        default:
          break;
      }

      misc.response(res, 200, false, 'OK', {
        waybill: waybill,
        receipt: receipt,
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  receiptPng: async (req, res) => {
    try {
      const { invoice } = req.params;

      const order = await Order.detail(invoice);
      if (!order) {
        return res.status(404).json({ error: true, message: 'Order tidak ditemukan' });
      }

      // pastikan waybill sudah ada
      if (!order.waybill) {
        return res
          .status(400)
          .json({ error: true, message: 'waybill belum ada, generate WAYBILL dulu' });
      }

      const shop = await Shop.detail(order.shop_id);
      const mosque = await Mosque.detail(order.mosque_id);

      const dateText = moment().format('YYYY-MM-DD');

      // opsional: kalau kamu punya tracking url internal
      // const qrText = `https://domain-kamu.com/track/${order.waybill}`;
      const qrText = order.waybill;

      const png = await generateReceiptPng({
        dateText,
        invoice: order.invoice || invoice,
        waybill: order.waybill,
        qrText,

        senderName: shop?.name,
        senderPhone: shop?.phone,
        senderAddress: shop?.address,
        senderCity: shop?.city,
        senderZip: shop?.zip_code,

        receiverName: mosque?.name,
        receiverPhone: mosque?.phone,
        receiverAddress: mosque?.detail_address,
        receiverCity: mosque?.city,
        receiverZip: mosque?.zip_code,

        courier: 'JNE',
        serviceCode: order.jne_service_code,
        qty: order.product_qty,
        weight: order.product_weight,
        goodsValue: order.amount,
      });

      res.setHeader('Content-Type', 'image/png');
      // inline = tampil di browser; attachment = auto download
      res.setHeader('Content-Disposition', `inline; filename="resi-${invoice}.png"`);
      return res.status(200).send(png);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ error: true, message: e.message });
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

  callback: async (req, res) => {
    try {
      const { order_id, status } = req.body;

      if (status == 'PAID') {
        await Order.updatePayment(order_id, status);

        var order = await Order.detail(order_id);

        if (order.status == 'PAID') throw new Error('Sudah dibayar');

        var mosqueId = order.mosque_id;

        var items = await Order.orderItem(order.id);

        for (const i in items) {
          var item = items[i];

          var productId = item.id;

          if (parseInt(item.stock) < parseInt(item.qty)) {
            throw new Error(`Stock tidak cukup untuk produk ${productId}. Sisa: ${item.stock}`);
          }

          var currStock = parseInt(item.stock) - parseInt(item.qty);

          await Mosque.updateAssignProductStock(currStock, productId, mosqueId);
        }
      }

      misc.response(res, 200, false, 'Callback called');
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
