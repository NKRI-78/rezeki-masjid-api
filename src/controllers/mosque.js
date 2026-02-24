const misc = require('../helpers/response');
const Mosque = require('../models/Mosque');

function toMosqueResponse(row) {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    detail_address: row.detail_address,
    lat: row.lat,
    lng: row.lng,
    created_at: row.created_at,
    update_at: row.update_at,
  };
}

module.exports = {
  // GET /mosques?page=1&limit=10&search=abc
  list: async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const search = req.query.search || '';

      const [rows, total] = await Promise.all([
        Mosque.list({ page, limit, search }),
        Mosque.count({ search }),
      ]);

      const p = Number(page) || 1;
      const l = Number(limit) || 10;
      const totalPages = l === 0 ? 0 : Math.ceil(total / l);

      const items = rows.map(toMosqueResponse);

      return misc.response(res, 200, false, 'OK', {
        items,
        page: p,
        limit: l,
        total,
        total_pages: totalPages,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // GET /mosques/:id
  detail: async (req, res) => {
    try {
      const { id } = req.params;

      const row = await Mosque.detail(id);
      if (!row) return misc.response(res, 404, true, 'Mosque not found');

      return misc.response(res, 200, false, 'OK', {
        item: toMosqueResponse(row),
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // POST /mosques
  create: async (req, res) => {
    try {
      const { name, path, detail_address, lat, lng } = req.body;

      if (!name) return misc.response(res, 400, true, 'name is required');

      const created = await Mosque.create({
        name,
        path,
        detail_address,
        lat,
        lng,
      });

      const row = await Mosque.detail(created.id);

      return misc.response(res, 201, false, 'Created', {
        item: row ? toMosqueResponse(row) : null,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // PUT /mosques/:id
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, path, detail_address, lat, lng } = req.body;

      const exists = await Mosque.detail(id);
      if (!exists) return misc.response(res, 404, true, 'Mosque not found');

      const updated = await Mosque.update(id, {
        name,
        path,
        detail_address,
        lat,
        lng,
      });

      if (!updated.affectedRows) return misc.response(res, 400, true, 'Failed to update');

      const row = await Mosque.detail(id);

      return misc.response(res, 200, false, 'Updated', {
        item: row ? toMosqueResponse(row) : null,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // DELETE /mosques/:id
  remove: async (req, res) => {
    try {
      const { id } = req.params;

      const exists = await Mosque.detail(id);
      if (!exists) return misc.response(res, 404, true, 'Mosque not found');

      const deleted = await Mosque.remove(id);

      if (!deleted.affectedRows) return misc.response(res, 400, true, 'Failed to delete');

      return misc.response(res, 200, false, 'Deleted', {});
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },
};
