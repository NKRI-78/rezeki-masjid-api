const conn = require('../configs/db');

module.exports = {
  list: ({ page = 1, limit = 10, search = '', status = '', user_id }) => {
    return new Promise((resolve, reject) => {
      const p = Number(page) || 1;
      const l = Number(limit) || 10;
      const offset = (p - 1) * l;

      const s = String(search || '').trim();
      const st = String(status || '').trim();

      const where = [];
      const params = [];

      if (s) {
        where.push(`invoice LIKE ?`);
        params.push(`%${s}%`);
      }

      if (st) {
        where.push(`status = ?`);
        params.push(st);
      }

      if (user_id) {
        where.push(`user_id = ?`);
        params.push(user_id);
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const queryItems = `
      SELECT *
      FROM orders
      ${whereClause}
      ORDER BY id DESC
      LIMIT ?
      OFFSET ?;
    `;

      const queryCount = `
      SELECT COUNT(*) AS total
      FROM orders
      ${whereClause};
    `;

      conn.query(queryCount, params, (eCount, rCount) => {
        if (eCount) return reject(eCount);

        const total = Number(rCount?.[0]?.total || 0);
        const total_pages = l <= 0 ? 0 : Math.ceil(total / l);

        conn.query(queryItems, [...params, l, offset], (eItems, items) => {
          if (eItems) return reject(eItems);

          resolve({
            items: items || [],
            page: p,
            limit: l,
            total,
            total_pages,
          });
        });
      });
    });
  },

  detail: (invoice) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT *
        FROM orders
        WHERE invoice = ?
        LIMIT 1;
      `;

      conn.query(query, [invoice], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result?.[0] || null);
      });
    });
  },

  selectShopDistrict: (shop_id) => {
    const query = `SELECT district FROM shops WHERE id = ?`;

    return new Promise((resolve, reject) => {
      conn.query(query, [shop_id], (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },

  selectMosqueDistrict: (mosque_id) => {
    const query = `SELECT district FROM mosques WHERE id = ?`;

    return new Promise((resolve, reject) => {
      conn.query(query, [mosque_id], (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },

  getTariffCode: (subdistrict) => {
    var query = `SELECT tariff_code FROM jne_destinations WHERE district_name = ?`;

    return new Promise((resolve, reject) => {
      conn.query(query, [subdistrict], (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result[0].tariff_code);
        }
      });
    });
  },

  invoice: (invoiceValue) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM orders WHERE date_value = '${invoiceValue}' ORDER BY no DESC LIMIT 1`;

      conn.query(query, [invoiceValue], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result || []);
      });
    });
  },

  orderItem: (invoiceId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT p.id, p.title, p.content, p.price, pa.stock, oi.qty, p.weight, p.shop_id, p.created_at, p.updated_at
        FROM order_items oi
        INNER JOIN products p ON p.id = oi.product_id 
        INNER JOIN product_assigns pa ON p.id = pa.product_id 
        WHERE oi.invoice_id = ?
      `;

      conn.query(query, [invoiceId], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result || []);
      });
    });
  },

  orderUpdateWaybill: (waybill, receipt, invoice) => {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE orders SET waybill = ?, receipt = ?, waybill_created_at = NOW() WHERE invoice = ?
      `;

      conn.query(query, [waybill, receipt, invoice], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result?.[0] || null);
      });
    });
  },

  updateStatus: (invoice, status) => {
    return new Promise((resolve, reject) => {
      var query = `
        UPDATE orders SET status = ? WHERE invoice = ?
      `;

      if (status == 'PAID') {
        query = `
        UPDATE orders SET status = ?, paid_at = NOW() WHERE invoice = ?
      `;
      }

      if (status == 'FINISHED') {
        query = `UPDATE orders SET status = ?, finished_at = NOW() WHERE invoice = ?`;
      }

      conn.query(query, [status, invoice], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result?.[0] || null);
      });
    });
  },

  create: ({ invoice, no, jne_price, jne_service_code, date_value, user_id }) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO orders (invoice, no, jne_price, jne_service_code, date_value, user_id)
        VALUES (?, ?, ?, ?, ?, ?);
      `;

      const params = [invoice, no, jne_price, jne_service_code, date_value, user_id];

      conn.query(query, params, (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result.insertId);
      });
    });
  },

  createOrderItem: ({ invoice, product_id, qty }) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO order_items (invoice_id, product_id, qty)
        VALUES (?, ?, ?);
      `;

      const params = [invoice, product_id, qty];

      conn.query(query, params, (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result);
      });
    });
  },

  update: (payload) => {
    return new Promise((resolve, reject) => {
      const {
        payment_method,
        payment_code,
        billing_no,
        invoice,
        product_qty,
        product_weight,
        shop_id,
        mosque_id,
        amount,
      } = payload;

      const query = `
        UPDATE orders SET payment_method = ?, payment_code = ?, billing_no = ?, product_qty = ?, product_weight = ?, shop_id = ?, mosque_id = ?, amount = ?
        WHERE invoice = ?
      `;

      const params = [
        payment_method,
        payment_code,
        billing_no,
        product_qty,
        product_weight,
        shop_id,
        mosque_id,
        amount,
        invoice,
      ];

      conn.query(query, params, (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result);
      });
    });
  },

  remove: (invoice) => {
    return new Promise((resolve, reject) => {
      const inv = String(invoice || '').trim();

      const query = `DELETE FROM orders WHERE invoice = ?;`;

      conn.query(query, [inv], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result);
      });
    });
  },
};
