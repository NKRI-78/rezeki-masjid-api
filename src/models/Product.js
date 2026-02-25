const conn = require('../configs/db');

module.exports = {
  // LIST + pagination + optional search
  list: ({ page = 1, limit = 10, search = '' }) => {
    return new Promise((resolve, reject) => {
      const p = Number(page) || 1;
      const l = Number(limit) || 10;
      const offset = (p - 1) * l;

      const keyword = `%${search}%`;

      const query = `
        SELECT
          p.id,
          p.title,
          p.content,
          p.price,
          p.stock,
          p.created_at,
          p.update_at,
          m.id AS mosque_id,
          m.name AS mosque_name,
          m.path AS mosque_path,
          m.detail_address AS mosque_detail_address,
          m.lat AS mosque_lat,
          m.lng AS mosque_lng,
          ms.id AS shop_id,
          ms.name AS shop_name,
          ms.is_active AS shop_active
        FROM products p
        LEFT JOIN mosques m ON m.id = p.mosque_id
        LEFT JOIN mosque_shops ms ON ms.mosque_id = m.id
        WHERE (? = '' OR p.title LIKE ? OR p.content LIKE ?)
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
      `;

      conn.query(query, [search, keyword, keyword, l, offset], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result);
      });
    });
  },

  // TOTAL untuk pagination
  count: ({ search = '' }) => {
    return new Promise((resolve, reject) => {
      const keyword = `%${search}%`;

      const query = `
        SELECT COUNT(*) AS total
        FROM products p
        WHERE (? = '' OR p.title LIKE ? OR p.content LIKE ?)
      `;

      conn.query(query, [search, keyword, keyword], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result?.[0]?.total || 0);
      });
    });
  },

  // DETAIL by id
  detail: (id) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          p.id,
          p.title,
          p.content,
          p.price,
          p.stock,
          p.created_at,
          p.update_at,

          m.id AS mosque_id,
          m.name AS mosque_name,
          m.path AS mosque_path,
          m.detail_address AS mosque_detail_address,
          m.lat AS mosque_lat,
          m.lng AS mosque_lng
        FROM products p
        LEFT JOIN mosques m ON m.id = p.mosque_id
        WHERE p.id = ?
        LIMIT 1
      `;

      conn.query(query, [id], (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result?.[0] || null);
      });
    });
  },

  // CREATE
  create: (payload) => {
    return new Promise((resolve, reject) => {
      const { title, content, price, stock, mosque_id } = payload;

      const query = `
        INSERT INTO products (title, content, price, stock, mosque_id, created_at, update_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;

      conn.query(query, [title, content, price, stock, mosque_id], (e, result) => {
        if (e) reject(new Error(e));
        else resolve({ id: result.insertId });
      });
    });
  },

  // UPDATE
  update: (id, payload) => {
    return new Promise((resolve, reject) => {
      const { title, content, price, stock, mosque_id } = payload;

      const query = `
        UPDATE products
        SET
          title = ?,
          content = ?,
          price = ?,
          stock = ?,
          mosque_id = ?,
          update_at = NOW()
        WHERE id = ?
      `;

      conn.query(query, [title, content, price, stock, mosque_id, id], (e, result) => {
        if (e) reject(new Error(e));
        else resolve({ affectedRows: result.affectedRows });
      });
    });
  },

  // DELETE
  remove: (id) => {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM products WHERE id = ?`;
      conn.query(query, [id], (e, result) => {
        if (e) reject(new Error(e));
        else resolve({ affectedRows: result.affectedRows });
      });
    });
  },
};
