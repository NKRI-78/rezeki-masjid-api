const conn = require('../configs/db');
const { toShopListResponse } = require('../helpers/utils');

module.exports = {
  // LIST + pagination + search
  list: ({ page = 1, limit = 10, search = '' }) => {
    return new Promise((resolve, reject) => {
      const p = Number(page) > 0 ? Number(page) : 1;
      const l = Number(limit) > 0 ? Number(limit) : 10;
      const offset = (p - 1) * l;

      const keyword = `%${search}%`;

      const where = search ? `WHERE (ms.name LIKE ? OR CAST(ms.mosque_id AS CHAR) LIKE ?)` : ``;

      const countQuery = `
        SELECT COUNT(*) AS total
        FROM mosque_shops ms
        ${where}
      `;

      const dataQuery = `
        SELECT
          ms.id,
          ms.name,
          ms.mosque_id,
          ms.is_active,
          ms.created_at,
          ms.updated_at,
          m.id AS mosque_id,
          m.path AS mosque_path,
          m.name AS mosque_name,
          m.detail_address AS mosque_detail_address,
          m.lat AS mosque_lat,
          m.lng AS mosque_lng
        FROM mosque_shops ms
        LEFT JOIN mosques m ON ms.mosque_id = m.id
        ${where}
        ORDER BY ms.id DESC
        LIMIT ? OFFSET ?
      `;

      const countParams = search ? [keyword, keyword] : [];
      const dataParams = search ? [keyword, keyword, l, offset] : [l, offset];

      conn.query(countQuery, countParams, (e, countRows) => {
        if (e) return reject(new Error(e));

        const total = Number(countRows?.[0]?.total || 0);
        const totalPages = Math.ceil(total / l);

        conn.query(dataQuery, dataParams, (e2, rows) => {
          if (e2) return reject(new Error(e2));

          const items = rows.map(toShopListResponse);

          resolve({
            items,
            page: p,
            limit: l,
            total,
            total_pages: totalPages,
          });
        });
      });
    });
  },

  // DETAIL
  detail: (id) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          ms.id,
          ms.name,
          ms.is_active,
          ms.created_at,
          ms.updated_at,
          m.id AS mosque_id,
          m.path AS mosque_path,
          m.name AS mosque_name,
          m.detail_address AS mosque_detail_address,
          m.lat AS mosque_lat,
          m.lng AS mosque_lng
        FROM mosque_shops ms
        LEFT JOIN mosques m ON m.id = ms.mosque_id
        WHERE ms.id = ?
        LIMIT 1
      `;

      conn.query(query, [id], (e, rows) => {
        const items = rows.map(toShopListResponse);

        if (e) reject(new Error(e));
        else resolve(items?.[0] || null);
      });
    });
  },

  // CREATE
  create: ({ name, mosque_id, is_active = 'enabled' }) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO mosque_shops (name, mosque_id, is_active)
        VALUES (?, ?, ?)
      `;

      conn.query(query, [name, mosque_id, is_active], (e, result) => {
        if (e) return reject(new Error(e));
        resolve({
          insertId: result.insertId,
        });
      });
    });
  },

  // UPDATE
  update: (id, { name, mosque_id, is_active }) => {
    return new Promise((resolve, reject) => {
      const fields = [];
      const params = [];

      if (name !== undefined) {
        fields.push('name = ?');
        params.push(name);
      }
      if (mosque_id !== undefined) {
        fields.push('mosque_id = ?');
        params.push(mosque_id);
      }
      if (is_active !== undefined) {
        fields.push('is_active = ?');
        params.push(is_active);
      }

      if (fields.length === 0) {
        return resolve({ affectedRows: 0 });
      }

      const query = `
        UPDATE mosque_shops
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      params.push(id);

      conn.query(query, params, (e, result) => {
        if (e) reject(new Error(e));
        else resolve({ affectedRows: result.affectedRows });
      });
    });
  },

  // DELETE
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM mosque_shops WHERE id = ?`;
      conn.query(query, [id], (e, result) => {
        if (e) reject(new Error(e));
        else resolve({ affectedRows: result.affectedRows });
      });
    });
  },

  // OPTIONAL: enable/disable cepat
  setActive: (id, isActive) => {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE mosque_shops
        SET is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      conn.query(query, [isActive, id], (e, result) => {
        if (e) reject(new Error(e));
        else resolve({ affectedRows: result.affectedRows });
      });
    });
  },
};
