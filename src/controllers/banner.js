const misc = require('../helpers/response');
const Banner = require('../models/Banner');

module.exports = {
  // GET /banners?page=1&limit=10&search=abc
  list: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      const data = await Banner.list({ page, limit, search });

      // dipisah dalam bracket "banners"
      misc.response(res, 200, false, 'OK', {
        banners: data,
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // GET /banners/:id
  detail: async (req, res) => {
    try {
      const { id } = req.params;

      const banner = await Banner.detail(id);
      if (!banner) {
        return misc.response(res, 404, true, 'Banner not found');
      }

      misc.response(res, 200, false, 'OK', {
        banner,
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // POST /banners  { "path": "..." }
  create: async (req, res) => {
    try {
      const { path } = req.body;

      if (!path || String(path).trim() === '') {
        return misc.response(res, 400, true, 'path is required');
      }

      const result = await Banner.insert({ path: String(path).trim() });
      const banner = await Banner.detail(result.insertId);

      misc.response(res, 201, false, 'Created', {
        banner,
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // PUT /banners/:id  { "path": "..." }
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { path } = req.body;

      if (!path || String(path).trim() === '') {
        return misc.response(res, 400, true, 'path is required');
      }

      // pastikan ada dulu
      const existing = await Banner.detail(id);
      if (!existing) {
        return misc.response(res, 404, true, 'Banner not found');
      }

      const result = await Banner.update(id, { path: String(path).trim() });
      if (!result.affectedRows) {
        return misc.response(res, 400, true, 'Failed to update banner');
      }

      const banner = await Banner.detail(id);

      misc.response(res, 200, false, 'Updated', {
        banner,
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // DELETE /banners/:id
  remove: async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await Banner.detail(id);
      if (!existing) {
        return misc.response(res, 404, true, 'Banner not found');
      }

      const result = await Banner.remove(id);
      if (!result.affectedRows) {
        return misc.response(res, 400, true, 'Failed to delete banner');
      }

      misc.response(res, 200, false, 'Deleted', {
        banner: existing,
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
