const conn = require('../configs/db');

module.exports = {
  // LIST + pagination + search
  list: ({ page = 1, limit = 10, search = '' }) => {
    return new Promise((resolve, reject) => {
      const p = Number(page) || 1;
      const l = Number(limit) || 10;
      const offset = (p - 1) * l;
      const keyword = `%${search}%`;

      const query = `
        SELECT *
        FROM mosques
        WHERE (? = '' OR name LIKE ? OR detail_address LIKE ?)
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `;

      conn.query(query, [search, keyword, keyword, l, offset], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result);
      });
    });
  },

  count: ({ search = '' }) => {
    return new Promise((resolve, reject) => {
      const keyword = `%${search}%`;

      const query = `
        SELECT COUNT(*) AS total
        FROM mosques
        WHERE (? = '' OR name LIKE ? OR detail_address LIKE ?)
      `;

      conn.query(query, [search, keyword, keyword], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result?.[0]?.total || 0);
      });
    });
  },

  detail: (id) => {
    return new Promise((resolve, reject) => {
      conn.query(`SELECT * FROM mosques WHERE id = ? LIMIT 1`, [id], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result?.[0] || null);
      });
    });
  },

  create: (payload) => {
    return new Promise((resolve, reject) => {
      const { name, path, detail_address, lat, lng } = payload;

      const query = `
        INSERT INTO mosques (name, path, detail_address, lat, lng, created_at, update_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;

      conn.query(query, [name, path, detail_address, lat, lng], (e, result) => {
        if (e) reject(new Error(e));
        else resolve({ id: result.insertId });
      });
    });
  },

  update: (id, payload) => {
    return new Promise((resolve, reject) => {
      const { name, path, detail_address, lat, lng } = payload;

      const query = `
        UPDATE mosques
        SET
          name = ?,
          path = ?,
          detail_address = ?,
          lat = ?,
          lng = ?,
          update_at = NOW()
        WHERE id = ?
      `;

      conn.query(query, [name, path, detail_address, lat, lng, id], (e, result) => {
        if (e) reject(new Error(e));
        else resolve({ affectedRows: result.affectedRows });
      });
    });
  },

  remove: (id) => {
    return new Promise((resolve, reject) => {
      conn.query(`DELETE FROM mosques WHERE id = ?`, [id], (e, result) => {
        if (e) reject(new Error(e));
        else resolve({ affectedRows: result.affectedRows });
      });
    });
  },
};
