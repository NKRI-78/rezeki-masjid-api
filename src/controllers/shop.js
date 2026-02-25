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
      if (!shop) return misc.response(res, 404, true, 'Toko tidak ditemukan');

      misc.response(res, 200, false, 'OK', shop);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // POST /shops
  create: async (req, res) => {
    var userId = req.decoded.id;

    try {
      const { name, phone, address, lat, lng, is_active } = req.body;

      if (!name) return misc.response(res, 400, true, 'nama wajib dibutuhkan');
      if (!phone) return misc.response(res, 400, true, 'phone wajib dibutuhkan');
      if (!address) return misc.response(res, 400, true, 'address wajib dibutuhkan');
      if (!lat) return misc.response(res, 400, true, 'lat wajib dibutuhkan');
      if (!lng) return misc.response(res, 400, true, 'lng wajib dibutuhkan');
      if (!userId) return misc.response(res, 400, true, 'user_id wajib dibutuhkan');

      if (is_active && !['enabled', 'disabled'].includes(is_active)) {
        return misc.response(res, 400, true, "is_active harus 'enabled' atau 'disabled'");
      }

      const created = await Shop.create({
        name,
        phone,
        address,
        lat,
        lng,
        userId,
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
    var userId = req.decoded.id;

    try {
      const { id } = req.params;
      const { name, phone, address, lat, lng, is_active } = req.body;

      const exists = await Shop.detail(id);
      if (!exists) return misc.response(res, 404, true, 'Toko tidak ditemukan');

      if (is_active !== undefined && !['enabled', 'disabled'].includes(is_active)) {
        return misc.response(res, 400, true, "is_active harus 'enabled' atau 'disabled'");
      }

      const updated = await Shop.update(id, { name, phone, address, lat, lng, userId, is_active });
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
      if (!exists) return misc.response(res, 404, true, 'Toko tidak ditemukan');

      const deleted = await Shop.delete(id);
      if (!deleted.affectedRows) return misc.response(res, 400, true, 'Failed to update');

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
        return misc.response(res, 400, true, "is_active harus 'enabled' atau 'disabled'");
      }

      const exists = await Shop.detail(id);
      if (!exists) return misc.response(res, 404, true, 'Toko tidak ditemukan');

      await Shop.setActive(id, is_active);

      const detail = await Shop.detail(id);
      misc.response(res, 200, false, 'updated', detail);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
