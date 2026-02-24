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
