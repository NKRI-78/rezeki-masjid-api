const conn = require('../configs/db');

module.exports = {
  // LIST + pagination + optional search
  // return: { items, page, limit, total, total_pages }
  list: ({ page = 1, limit = 10, search = '' }) => {
    return new Promise((resolve, reject) => {
      const p = Number(page) || 1;
      const l = Number(limit) || 10;
      const offset = (p - 1) * l;

      const s = String(search || '').trim();
      const keyword = `%${s}%`;

      const whereClause = `WHERE (? = '' OR b.path LIKE ?)`;

      const queryItems = `
        SELECT
          b.id,
          b.path,
          b.created_at,
          b.updated_at
        FROM banners b
        ${whereClause}
        ORDER BY b.id DESC
        LIMIT ?
        OFFSET ?;
      `;

      const queryCount = `
        SELECT COUNT(*) AS total
        FROM banners b
        ${whereClause};
      `;

      conn.query(queryCount, [s, keyword], (eCount, rCount) => {
        if (eCount) return reject(new Error(eCount));

        const total = Number(rCount?.[0]?.total || 0);
        const total_pages = l <= 0 ? 0 : Math.ceil(total / l);

        conn.query(queryItems, [s, keyword, l, offset], (eItems, items) => {
          if (eItems) return reject(new Error(eItems));

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

  // DETAIL by id
  detail: (id) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          b.id,
          b.path,
          b.created_at,
          b.updated_at
        FROM banners b
        WHERE b.id = ?
        LIMIT 1;
      `;

      conn.query(query, [id], (e, rows) => {
        if (e) return reject(new Error(e));
        resolve(rows?.[0] || null);
      });
    });
  },

  // CREATE
  insert: ({ link, path }) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO banners (link, path, created_at, updated_at)
        VALUES (?, ?, NOW(), NOW());
      `;

      conn.query(query, [link, path], (e, result) => {
        if (e) return reject(new Error(e));
        resolve({
          insertId: result.insertId,
          affectedRows: result.affectedRows,
        });
      });
    });
  },

  // UPDATE
  update: (id, { link, path }) => {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE banners
        SET link = ?, path = ?, updated_at = NOW()
        WHERE id = ?;
      `;

      conn.query(query, [link, path, id], (e, result) => {
        if (e) return reject(new Error(e));
        resolve({
          affectedRows: result.affectedRows,
        });
      });
    });
  },

  // DELETE
  remove: (id) => {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM banners WHERE id = ?;`;

      conn.query(query, [id], (e, result) => {
        if (e) return reject(new Error(e));
        resolve({
          affectedRows: result.affectedRows,
        });
      });
    });
  },
};
