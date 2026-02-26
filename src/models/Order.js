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
        where.push(`o.invoice LIKE ?`);
        params.push(`%${s}%`);
      }

      if (st) {
        where.push(`o.status = ?`);
        params.push(st);
      }

      if (user_id) {
        where.push(`o.user_id = ?`);
        params.push(user_id);
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const queryItems = `
      SELECT o.id, o.invoice, o.amount, o.user_id, o.status
      FROM orders o
      ${whereClause}
      ORDER BY o.id DESC
      LIMIT ?
      OFFSET ?;
    `;

      const queryCount = `
      SELECT COUNT(*) AS total
      FROM orders o
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
        SELECT p.id, p.title, p.content, p.price, p.stock, p.weight, p.shop_id, p.created_at, p.updated_at
        FROM order_items oi
        INNER JOIN products p ON p.id = oi.product_id 
        WHERE oi.invoice_id = ?
      `;

      conn.query(query, [invoiceId], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result || []);
      });
    });
  },

  detail: (invoice) => {
    return new Promise((resolve, reject) => {
      const inv = String(invoice || '').trim();

      const query = `
        SELECT o.id, o.invoice,
          o.amount,
          o.user_id,
          o.status
        FROM orders o
        WHERE o.invoice = ?
        LIMIT 1;
      `;

      conn.query(query, [inv], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result?.[0] || null);
      });
    });
  },

  updatePayment: (orderId, status) => {
    return new Promise((resolve, reject) => {
      const inv = String(invoice || '').trim();

      const query = `
        UPDATE orders SET status = ? WHERE invoice = ?
      `;

      conn.query(query, [status, orderId], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result?.[0] || null);
      });
    });
  },

  create: ({ invoice, no, date_value, amount, user_id }) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO orders (invoice, no, date_value, amount, user_id)
        VALUES (?, ?, ?, ?, ?);
      `;

      const params = [invoice, no, date_value, amount, user_id];

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

  update: (invoice, payload) => {
    return new Promise((resolve, reject) => {
      const inv = String(invoice || '').trim();

      const fields = [];
      const values = [];

      if (payload.amount !== undefined) {
        fields.push('amount = ?');
        values.push(Number(payload.amount));
      }

      if (payload.product_id !== undefined) {
        fields.push('product_id = ?');
        values.push(Number(payload.product_id));
      }
      if (payload.user_id !== undefined) {
        fields.push('user_id = ?');
        values.push(Number(payload.user_id));
      }
      if (payload.qty !== undefined) {
        fields.push('qty = ?');
        values.push(Number(payload.qty));
      }
      if (payload.status !== undefined) {
        fields.push('status = ?');
        values.push(String(payload.status || '').trim());
      }

      if (fields.length === 0) return resolve({ affectedRows: 0 });

      const query = `
        UPDATE orders
        SET ${fields.join(', ')}
        WHERE invoice = ?;
      `;

      values.push(inv);

      conn.query(query, values, (e, result) => {
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
