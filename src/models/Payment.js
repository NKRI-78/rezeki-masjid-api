const connPayment = require('../configs/db_payment');

module.exports = {
  // LIST + pagination + optional search
  // GET /payment?page=1&limit=10&search=abc
  list: ({ page = 1, limit = 10, search = '' }) => {
    return new Promise((resolve, reject) => {
      const p = Number(page) || 1;
      const l = Number(limit) || 10;
      const offset = (p - 1) * l;

      const keyword = `%${search}%`;

      // base filter: exclude bca
      // search bisa match: name / nameCode / platform
      const where = `
        WHERE nameCode != 'bca'
          AND (
            ? = '' OR
            name LIKE ? OR
            nameCode LIKE ? OR
            platform LIKE ?
          )
      `;

      const qItems = `
        SELECT id, name, nameCode, logo, platform, fee
        FROM Channels
        ${where}
        ORDER BY id DESC
        LIMIT ?
        OFFSET ?
      `;

      const qCount = `
        SELECT COUNT(*) AS total
        FROM Channels
        ${where}
      `;

      const paramsWhere = [search, keyword, keyword, keyword];

      connPayment.query(qCount, paramsWhere, (e1, r1) => {
        if (e1) return reject(new Error(e1));

        const total = Number(r1?.[0]?.total || 0);
        const total_pages = Math.ceil(total / l);

        connPayment.query(qItems, [...paramsWhere, l, offset], (e2, r2) => {
          if (e2) return reject(new Error(e2));

          resolve({
            items: r2 || [],
            page: p,
            limit: l,
            total,
            total_pages,
          });
        });
      });
    });
  },

  getListByPaymentCode: (id) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT id, name, nameCode, logo, platform, fee FROM Channels WHERE nameCode = ?`;
      connPayment.query(query, id, (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result);
      });
    });
  },

  getListByPaymentChannel: (id) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT id, name, nameCode, logo, platform, fee FROM Channels WHERE id = ?`;
      connPayment.query(query, id, (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result);
      });
    });
  },

  checkPaymentIsExist: (orderId) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT orderId, grossAmount AS amount, ChannelId, data, expire FROM Payments WHERE orderId = ?`;
      const values = [orderId];

      connPayment.query(query, values, (e, result) => {
        if (e) reject(new Error(e));
        else resolve(result);
      });
    });
  },
};
