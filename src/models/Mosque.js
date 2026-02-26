const conn = require('../configs/db');

module.exports = {
  // LIST + pagination + search
  list: ({
    page = 1,
    limit = 10,
    search = '',
    lat = null,
    lng = null,
    sort = 'latest',
    radius_km = null,
  }) => {
    return new Promise((resolve, reject) => {
      const p = Number(page) || 1;
      const l = Number(limit) || 10;
      const offset = (p - 1) * l;
      const keyword = `%${search}%`;

      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
      const hasRadius = hasCoords && Number.isFinite(radius_km) && radius_km > 0;

      // Haversine (km). 6371 = radius bumi (km)
      // Penting: urutan placeholder harus konsisten dengan params push
      const distanceExpr = `
      (6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(? - lat) / 2), 2) +
        COS(RADIANS(?)) * COS(RADIANS(lat)) *
        POWER(SIN(RADIANS(? - lng) / 2), 2)
      )))
    `;

      const distanceSelect = hasCoords
        ? `, ${distanceExpr} AS distance_km`
        : `, NULL AS distance_km`;

      // Sort: nearest kalau ada coords, else fallback latest
      const orderBy =
        sort === 'nearest' && hasCoords ? `ORDER BY distance_km ASC, id DESC` : `ORDER BY id DESC`;

      // Radius filter pakai HAVING (karena distance_km hasil kalkulasi)
      const having = hasRadius ? `HAVING distance_km <= ?` : ``;

      const query = `
      SELECT *
      ${distanceSelect}
      FROM mosques
      WHERE (? = '' OR name LIKE ? OR detail_address LIKE ?)
      ${having}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

      const params = [];

      // untuk distanceExpr ada 3 placeholder: (? - latitude), (?), (? - longitude)
      if (hasCoords) params.push(lat, lat, lng);

      // filter search
      params.push(search, keyword, keyword);

      // radius di HAVING
      if (hasRadius) params.push(radius_km);

      // paging
      params.push(l, offset);

      conn.query(query, params, (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result);
      });
    });
  },

  getAssignedProducts: ({ mosque_id }) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT p.id, p.title, p.content, pa.is_active, p.price, p.stock, p.weight
        FROM products p
        INNER JOIN product_assigns pa 
        ON pa.product_id = p.id 
        WHERE pa.mosque_id = ?
      `;

      conn.query(query, [mosque_id], (e, result) => {
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

  checkAssignProduct: (mosqueId, productId) => {
    return new Promise((resolve, reject) => {
      conn.query(
        `SELECT product_id, mosque_id 
        FROM product_assigns 
        WHERE mosque_id = ? 
        AND product_id = ?`,
        [mosqueId, productId],
        (e, result) => {
          if (e) reject(new Error(e));
          else resolve(result);
        },
      );
    });
  },

  assignProduct: (mosqueId, productId, needStuff) => {
    return new Promise((resolve, reject) => {
      conn.query(
        `INSERT INTO product_assigns (mosque_id, product_id) 
        VALUES (?, ?)`,
        [mosqueId, productId, needStuff],
        (e, result) => {
          if (e) reject(new Error(e));
          else resolve(result?.[0] || null);
        },
      );
    });
  },

  toggleActiveProduct: (isActive, productId, mosqueId) => {
    return new Promise((resolve, reject) => {
      conn.query(
        `UPDATE product_assigns SET is_active = ?
        WHERE product_id = ? AND mosque_id = ?`,
        [isActive, productId, mosqueId],
        (e, result) => {
          if (e) reject(new Error(e));
          else resolve(result?.[0] || null);
        },
      );
    });
  },

  updateAssignProduct: (needStuff, productId, mosqueId) => {
    return new Promise((resolve, reject) => {
      conn.query(
        `UPDATE product_assigns SET need_stuff = ?, product_id = ? 
        WHERE mosque_id = ?`,
        [needStuff, productId, mosqueId],
        (e, result) => {
          if (e) reject(new Error(e));
          else resolve(result);
        },
      );
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
      const { name, description, path, detail_address, district, lat, lng } = payload;

      const query = `
        INSERT INTO mosques (name, description, path, detail_address, district, lat, lng, created_at, update_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      conn.query(
        query,
        [name, description, path, detail_address, district, lat, lng],
        (e, result) => {
          if (e) reject(new Error(e));
          else resolve({ id: result.insertId });
        },
      );
    });
  },

  update: (id, payload) => {
    return new Promise((resolve, reject) => {
      const { name, description, path, detail_address, district, lat, lng } = payload;

      const query = `
        UPDATE mosques
        SET
          name = ?,
          description = ?,
          path = ?,
          detail_address = ?,
          district = ?,
          lat = ?,
          lng = ?,
          update_at = NOW()
        WHERE id = ?
      `;

      conn.query(
        query,
        [name, description, path, detail_address, district, lat, lng, id],
        (e, result) => {
          if (e) reject(new Error(e));
          else resolve({ affectedRows: result.affectedRows });
        },
      );
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
