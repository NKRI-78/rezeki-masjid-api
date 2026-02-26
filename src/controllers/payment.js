const misc = require('../helpers/response');
const Payment = require('../models/Payment');

module.exports = {
  // GET /payment?page=1&limit=10&search=abc
  list: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      const rows = await Payment.list({ page, limit, search });

      misc.response(res, 200, false, 'OK', {
        items: rows.items,
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
};
