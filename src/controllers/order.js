const moment = require('moment-timezone');
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
    const role = req.decoded.role;

    try {
      const { page = 1, limit = 10, search = '', status } = req.query;

      const rows = await Order.list({ page, limit, search, status, user_id: userId, role });

      var items = [];

      for (const i in rows.items) {
        const row = rows.items[i];

        const products = await Order.orderItem(row.id);
        const shop = await Shop.detail(row.shop_id);
        const mosque = await Mosque.detail(row.mosque_id);
        const user = await User.me(row.user_id);

        var dataProduct = [];

        for (const z in products) {
          var product = products[z];

          var media = await Product.getMedia({ product_id: product.id });

          dataProduct.push({
            id: product.id,
            title: product.title,
            media: media,
            content: product.content,
            is_active: product.is_active,
            price: product.price,
            stock: product.stock,
            qty: product.qty,
            weight: product.weight,
          });
        }

        items.push({
          invoice: row.invoice,
          amount: row.amount,
          fee: row.fee,
          status: row.status,
          billing_no: row.billing_no,
          payment_method: row.payment_method,
          payment_code: row.payment_code,
          jne_service_code: row.jne_service_code,
          jne_price: row.jne_price,
          how_to_use: row.how_to_use,
          receipt: row.receipt,
          waybill: row.waybill,
          shop: shop,
          mosque: mosque,
          products: dataProduct,
          user: {
            id: user.id,
            avatar: user.avatar,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            role: user.role == 1 ? 'admin' : 'user',
          },
          paid_at: row.paid_at,
          process_at: row.process_at,
          waybill_created_at: row.waybill_created_at,
          finished_at: row.finished_at,
          created_at: row.created_at,
          expire_at: row.expire_at,
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
      if (!row) return misc.response(res, 404, true, 'Order tidak ditemukan');

      const actorId = req?.decoded?.id;
      const actorRole = String(req?.decoded?.role || '').toLowerCase();
      const isAdmin = actorRole === 'admin';

      if (!isAdmin && String(row.user_id) !== String(actorId)) {
        return misc.response(res, 403, true, 'Forbidden');
      }

      const products = await Order.orderItem(row.id);
      const shop = await Shop.detail(row.shop_id);
      const mosque = await Mosque.detail(row.mosque_id);
      const user = await User.me(row.user_id);

      var dataProduct = [];

      for (const z in products) {
        var product = products[z];

        var media = await Product.getMedia({ product_id: product.id });

        dataProduct.push({
          id: product.id,
          title: product.title,
          media: media,
          content: product.content,
          is_active: product.is_active,
          price: product.price,
          stock: product.stock,
          qty: product.qty,
          weight: product.weight,
        });
      }

      misc.response(res, 200, false, 'OK', {
        invoice: row.invoice,
        amount: row.amount,
        fee: row.fee,
        qty: row.qty,
        status: row.status,
        billing_no: row.billing_no,
        payment_method: row.payment_method,
        payment_code: row.payment_code,
        jne_service_code: row.jne_service_code,
        jne_price: row.jne_price,
        how_to_use: row.how_to_use,
        receipt: row.receipt,
        waybill: row.waybill,
        shop: shop,
        mosque: mosque,
        products: dataProduct,
        user: {
          id: user.id,
          avatar: user.avatar,
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          role: user.role == 1 ? 'admin' : 'user',
        },
        paid_at: row.paid_at,
        process_at: row.process_at,
        waybill_created_at: row.waybill_created_at,
        finished_at: row.finished_at,
        created_at: row.created_at,
        expire_at: row.expire_at,
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
      var invoiceValue = `BM${invoiceDate}00${counterNumber}${random}`;

      var order = await Order.create({
        invoice: invoiceValue,
        no: counterNumber,
        jne_service_code: jne_service_code,
        jne_price: jne_price,
        date_value: invoiceDate,
        user_id: userId,
      });

      var fee = 0;
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

      var howToUse, paymentAccess, paymentType, paymentExpire;

      if (['gopay'].includes(payment_code)) {
        paymentAccess = result.data.data.data.actions[0].url;
        paymentType = 'emoney';
        paymentExpire = moment()
          .tz('Asia/Jakarta')
          .add(30, 'minutes')
          .format('YYYY-MM-DD HH:mm:ss');
        fee = 1500;
      } else {
        switch (payment_code) {
          case 'mandiri':
            howToUse = process.env.HOW_TO_USE_MANDIRI;
            break;
          case 'bri':
            howToUse = process.env.HOW_TO_USE_BRI;
            break;
          case 'bni':
            howToUse = process.env.HOW_TO_USE_BNI;
            break;
          case 'cimb':
            howToUse = process.env.HOW_TO_USE_CIMB;
            break;
          default:
            break;
        }
        paymentAccess = result.data.data.data.vaNumber;
        paymentType = 'va';
        paymentExpire = result.data.data.expire;
        fee = 6500;
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
        fee: fee,
        how_to_use: howToUse,
        expire_at: paymentExpire,
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

      let weight = 0;

      for (const i in items) {
        const item = items[i];
        const product = await Product.detail(item.product_id);

        weight += Number(product.weight) * Number(item.qty);
      }

      const selectMosqueSubdistrict = await Order.selectMosqueSubdistrict(mosque_id);
      if (selectMosqueSubdistrict.length === 0) throw new Error('Alamat masjid belum lengkap');

      const destinationTariffCode = await Order.getTariffCode(
        selectMosqueSubdistrict[0].subdistrict,
      );

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
      // LABEL USER FRIENDLY
      // ---------------------------
      const SERVICE_LABEL_MAP = {
        CTC: 'Reguler (Dalam Kota)',
        CTCYES: 'Express Besok Sampai',
        CTCSPS: 'Same Day',
        JTR: 'Kargo Hemat',
        'JTR<130': 'Kargo <130kg',
        'JTR>130': 'Kargo >130kg',
        'JTR>200': 'Kargo >200kg',
      };

      const getServiceLabel = (serviceDisplay, serviceCode) => {
        // beberapa response JNE kadang aneh, jadi cek display & code
        const d = String(serviceDisplay || '')
          .trim()
          .toUpperCase();
        const c = String(serviceCode || '')
          .trim()
          .toUpperCase();

        // prioritas exact match
        if (SERVICE_LABEL_MAP[d]) return SERVICE_LABEL_MAP[d];
        if (SERVICE_LABEL_MAP[c]) return SERVICE_LABEL_MAP[c];

        // fallback: kalau mengandung JTR tapi tidak exact (misal variasi)
        if (d.includes('JTR') || c.includes('JTR')) return 'Kargo Hemat';

        // fallback terakhir
        return serviceDisplay;
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

      // sort termurah di atas (price string)
      prices.sort((a, b) => Number(a.price) - Number(b.price));

      // hilangkan layanan same-day, lalu normalisasi label + unit estimasi
      prices = prices
        .filter((r) => {
          const timesRaw = String(r.times || '')
            .trim()
            .toUpperCase();
          const display = String(r.service_display || '').toUpperCase();
          const code = String(r.service_code || '').toUpperCase();
          const label = String(r.service_label || '').toUpperCase();

          const isSameDay =
            timesRaw === 'H' ||
            display.includes('SPS') ||
            display.includes('SAME DAY') ||
            code.includes('SPS') ||
            label.includes('SAME DAY');

          return !isSameDay;
        })
        .map((r) => {
          const timesRaw = String(r.times || '')
            .trim()
            .toUpperCase();
          const etdUnit = timesRaw === 'H' ? 'jam' : 'hari';

          let etdText = `${r.etd_from}-${r.etd_thru} ${etdUnit}`;
          if (timesRaw === 'H' && Number(r.etd_from) === 0 && Number(r.etd_thru) === 24) {
            etdText = 'maks. 24 jam (sejak pickup)';
          }

          return {
            service_label: getServiceLabel(r.service_display, r.service_code),
            ...r,
            times: timesRaw || 'D',
            etd_unit: etdUnit,
            etd_text: etdText,
          };
        });

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
      const { invoice, tracking_dummy } = req.body;

      if (typeof invoice === 'undefined' || invoice === '') {
        throw new Error('invoice wajib diisi');
      }

      const order = await Order.detail(invoice);
      if (!order) throw new Error('Order tidak ditemukan');

      // Normalisasi type biar aman dari case-sensitive
      const next = String(type || '').toUpperCase();

      let waybill;
      let receipt;
      let tracking;

      const generateWaybill = async () => {
        const url = process.env.WAYBILL_JNE;

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
          OLSHOP_SHIPPER_ADDR3: '',
          OLSHOP_SHIPPER_CITY: shop.city,
          OLSHOP_SHIPPER_REGION: '',
          OLSHOP_SHIPPER_ZIP: shop.zip_code,
          OLSHOP_SHIPPER_PHONE: parseInt(shop.phone),

          OLSHOP_RECEIVER_NAME: mosque.name,
          OLSHOP_RECEIVER_ADDR1: mosque.detail_address,
          OLSHOP_RECEIVER_ADDR2: mosque.detail_address,
          OLSHOP_RECEIVER_ADDR3: '',
          OLSHOP_RECEIVER_CITY: mosque.city,
          OLSHOP_RECEIVER_REGION: '',
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
          url,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data,
        };

        const result = await axios(config);

        if (result?.data?.detail?.length) {
          const d0 = result.data.detail[0];
          if (String(d0.status || '').toLowerCase() === 'error') {
            throw new Error(`${d0.reason} - ${d0.cnote_no}`);
          }
        }

        waybill = result.data.detail[0].cnote_no;
        receipt = `${process.env.BASE_URL}/api/v1/order/${invoice}/receipt.png`;

        await Order.orderUpdateWaybill(waybill, receipt, invoice);
      };

      /**
       * RULE URUTAN (state machine):
       * PAID (paid_at != null)
       * -> PROCESS (process_at != null)
       * -> WAYBILL (waybill_created_at != null)
       * -> FINISHED (finished_at != null)
       *
       * Catatan:
       * - "dibayar" event-nya biasanya dari payment callback, bukan endpoint ini.
       * - Endpoint ini hanya mengurus PROCESS, WAYBILL, FINISHED.
       */

      // Optional: cegah perubahan setelah finished
      if (order.finished_at != null) {
        throw new Error('Order sudah FINISHED, status tidak bisa diubah lagi');
      }

      switch (next) {
        case 'PROCESS': {
          // Wajib sudah dibayar
          if (order.paid_at == null) throw new Error('Order belum dibayar');

          // Cegah double / loncat balik
          if (order.process_at != null) throw new Error('Order sudah diproses');
          if (order.waybill_created_at != null)
            throw new Error('Order sudah generate resi, tidak bisa kembali ke PROCESS');

          await Order.updateStatus(invoice, 'process');

          // Requirement terbaru: saat PROCESS langsung generate waybill otomatis
          await generateWaybill();
          break;
        }

        // case 'WAYBILL' dihapus: waybill sekarang otomatis dibuat saat PROCESS.

        case 'TRACKING': {
          if (order.waybill_created_at == null || !order.waybill) {
            throw new Error('No Resi belum ada');
          }

          const useDummyTracking =
            tracking_dummy === true || String(tracking_dummy || '').toLowerCase() === 'true';

          if (useDummyTracking) {
            const now = new Date();
            const fmt = (d) => {
              const dd = String(d.getDate()).padStart(2, '0');
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const yyyy = d.getFullYear();
              const hh = String(d.getHours()).padStart(2, '0');
              const mi = String(d.getMinutes()).padStart(2, '0');
              return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
            };

            const h1 = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            const h2 = new Date(now.getTime() - 4 * 60 * 60 * 1000);
            const h3 = new Date(now.getTime() - 2 * 60 * 60 * 1000);

            tracking = {
              cnote: {
                cnote_no: order.waybill,
                reference_number: String(order.id || ''),
                cnote_origin: 'CGK10000',
                cnote_destination: 'CGK99999',
                cnote_services_code: order.jne_service_code || 'REG',
                servicetype: order.jne_service_code || 'REG',
                cnote_cust_no: process.env.USERNAME_JNE || '',
                cnote_date: h1.toISOString(),
                cnote_pod_receiver: null,
                cnote_receiver_name: 'PENERIMA',
                city_name: 'JAKARTA',
                cnote_pod_date: null,
                pod_status: 'ON_PROCESS',
                last_status: `WITH DELIVERY COURIER [${fmt(h3)}]`,
                cust_type: '060',
                cnote_amount: String(order.amount || 0),
                cnote_weight: String(order.product_weight || 0),
                pod_code: null,
                keterangan: null,
                cnote_goods_descr: '-',
                freight_charge: String(order.amount || 0),
                shippingcost: String(order.amount || 0),
                insuranceamount: '0',
                priceperkg: String(order.amount || 0),
                signature: null,
                photo: null,
                long: null,
                lat: null,
                estimate_delivery: '1 Days',
              },
              detail: [
                {
                  cnote_no: order.waybill,
                  cnote_date: h1.toISOString(),
                  cnote_weight: String(order.product_weight || 0),
                  cnote_origin: 'CGK10000',
                  cnote_shipper_name: 'TOKO REJEKI',
                  cnote_shipper_addr1: '-',
                  cnote_shipper_addr2: ' ',
                  cnote_shipper_addr3: null,
                  cnote_shipper_city: 'JAKARTA',
                  cnote_receiver_name: 'PENERIMA',
                  cnote_receiver_addr1: '-',
                  cnote_receiver_addr2: null,
                  cnote_receiver_addr3: null,
                  cnote_receiver_city: 'JAKARTA',
                },
              ],
              history: [
                {
                  date: fmt(h1),
                  desc: 'SHIPMENT RECEIVED BY JNE COUNTER OFFICER AT [JAKARTA]',
                  code: 'RC1',
                },
                {
                  date: fmt(h2),
                  desc: 'PICKED UP BY COURIER [JAKARTA]',
                  code: 'PU1',
                },
                {
                  date: fmt(h3),
                  desc: 'WITH DELIVERY COURIER [JAKARTA]',
                  code: 'IP3',
                },
              ],
            };
            break;
          }

          const trackingUrlTemplate = process.env.TRACKING_JNE;
          if (!trackingUrlTemplate) {
            throw new Error('TRACKING_JNE belum diset di env');
          }

          const trackingUrl = trackingUrlTemplate.replace(
            '{AWB}',
            encodeURIComponent(order.waybill),
          );

          const body = new URLSearchParams({
            username: process.env.USERNAME_JNE,
            api_key: process.env.KEY_API_JNE,
          }).toString();

          const trackingRes = await axios({
            method: 'POST',
            url: trackingUrl,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
            },
            data: body,
          });

          tracking = trackingRes?.data || null;
          break;
        }

        case 'FINISHED': {
          // Wajib urut: PAID -> PROCESS -> WAYBILL -> FINISHED
          if (order.paid_at == null) throw new Error('Order belum dibayar');
          if (order.process_at == null) throw new Error('Order belum diproses');
          if (order.waybill_created_at == null) throw new Error('No Resi belum ada');

          // Cegah double finished
          if (order.finished_at != null) throw new Error('Order sudah selesai');

          await Order.updateStatus(invoice, 'finished');
          break;
        }

        default: {
          throw new Error(`Status tidak valid. Gunakan PROCESS, TRACKING, atau FINISHED`);
        }
      }

      misc.response(res, 200, false, 'OK', { waybill, receipt, tracking });
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

      const actorId = req?.decoded?.id;
      const actorRole = String(req?.decoded?.role || '').toLowerCase();
      const isAdmin = actorRole === 'admin';

      if (!isAdmin && String(order.user_id) !== String(actorId)) {
        return res.status(403).json({ error: true, message: 'Forbidden' });
      }

      if (!order.waybill) {
        return res.status(400).json({ error: true, message: 'No Resi belum ada' });
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
};
