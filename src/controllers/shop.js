const misc = require('../helpers/response');
const Shop = require('../models/Shop');

module.exports = {
  // GET /shops?page=1&limit=10&search=
  list: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      const shops = await Shop.list({ page, limit, search });

      misc.response(res, 200, false, 'OK', shops);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // GET /shops/:id
  detail: async (req, res) => {
    try {
      const { id } = req.params;

      const shop = await Shop.detail(id);
      if (!shop) return misc.response(res, 404, true, 'shop not found');

      misc.response(res, 200, false, 'OK', shop);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // POST /shops
  create: async (req, res) => {
    try {
      const { name, mosque_id, is_active } = req.body;

      if (!name) return misc.response(res, 400, true, 'name is required');
      if (!mosque_id) return misc.response(res, 400, true, 'mosque_id is required');

      // validasi enum
      if (is_active && !['enabled', 'disabled'].includes(is_active)) {
        return misc.response(res, 400, true, "is_active must be 'enabled' or 'disabled'");
      }

      const created = await Shop.create({
        name,
        mosque_id,
        is_active: is_active || 'enabled',
      });

      const detail = await Shop.detail(created.insertId);

      misc.response(res, 201, false, 'created', detail);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // PUT /shops/:id
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, mosque_id, is_active } = req.body;

      const exists = await Shop.detail(id);
      if (!exists) return misc.response(res, 404, true, 'shop not found');

      if (is_active !== undefined && !['enabled', 'disabled'].includes(is_active)) {
        return misc.response(res, 400, true, "is_active must be 'enabled' or 'disabled'");
      }

      const updated = await Shop.update(id, { name, mosque_id, is_active });
      if (!updated.affectedRows) {
        // ga ada field berubah
        const detail = await Shop.detail(id);
        return misc.response(res, 200, false, 'no changes', detail);
      }

      const detail = await Shop.detail(id);
      misc.response(res, 200, false, 'updated', detail);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // DELETE /shops/:id
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const exists = await Shop.detail(id);
      if (!exists) return misc.response(res, 404, true, 'shop not found');

      const deleted = await Shop.delete(id);
      if (!deleted.affectedRows) return misc.response(res, 400, true, 'failed to delete');

      misc.response(res, 200, false, 'deleted', { id: Number(id) });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // PATCH /shops/:id/active
  setActive: async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      if (!is_active) return misc.response(res, 400, true, 'is_active is required');
      if (!['enabled', 'disabled'].includes(is_active)) {
        return misc.response(res, 400, true, "is_active must be 'enabled' or 'disabled'");
      }

      const exists = await Shop.detail(id);
      if (!exists) return misc.response(res, 404, true, 'shop not found');

      await Shop.setActive(id, is_active);

      const detail = await Shop.detail(id);
      misc.response(res, 200, false, 'updated', detail);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
