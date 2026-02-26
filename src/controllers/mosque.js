const misc = require('../helpers/response');
const { toMosqueResponse, formatDistanceKm } = require('../helpers/utils');
const Mosque = require('../models/Mosque');
const Product = require('../models/Product');

module.exports = {
  // GET /mosque?page=1&limit=10&search=abc&lat=-6.2&lng=106.8&sort=nearest&radius_km=5
  list: async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const search = req.query.search || '';

      const lat = req.query.lat !== undefined ? Number(req.query.lat) : null;
      const lng = req.query.lng !== undefined ? Number(req.query.lng) : null;

      const sort = req.query.sort || 'latest'; // 'nearest' | 'latest'
      const radius_km = req.query.radius_km !== undefined ? Number(req.query.radius_km) : null;

      const [rows, total] = await Promise.all([
        Mosque.list({ page, limit, search, lat, lng, sort, radius_km }),
        Mosque.count({ search }),
      ]);

      const p = Number(page) || 1;
      const l = Number(limit) || 10;
      const totalPages = l === 0 ? 0 : Math.ceil(total / l);

      const items = rows.map(toMosqueResponse);

      var data = [];

      for (const i in items) {
        var item = items[i];

        var products = await Mosque.getAssignedProducts({ mosque_id: item.id });

        var dataProduct = [];

        for (const z in products) {
          var product = products[z];

          var media = await Product.getMedia({ product_id: product.id });

          dataProduct.push({
            id: product.id,
            title: product.title,
            media: media,
            content: product.content,
            is_active: product.is_active,
            price: product.price,
            stock: product.stock,
            weight: product.weight,
          });
        }

        item.product_needs = dataProduct;

        data.push(item);
      }

      return misc.response(res, 200, false, 'OK', {
        data,
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

  // GET /mosque/:id
  detail: async (req, res) => {
    try {
      const { id } = req.params;

      const row = await Mosque.detail(id);
      if (!row) return misc.response(res, 404, true, 'Masjid tidak ditemukan');

      var products = await Mosque.getAssignedProducts({ mosque_id: row.id });

      var dataProduct = [];

      for (const z in products) {
        var product = products[z];

        var media = await Product.getMedia({ product_id: product.id });

        dataProduct.push({
          id: product.id,
          title: product.title,
          media: media,
          content: product.content,
          is_active: product.is_active,
          price: product.price,
          stock: product.stock,
          weight: product.weight,
        });
      }

      var item = {
        id: row.id,
        name: row.name,
        description: row.description,
        path: row.path,
        detail_address: row.detail_address,
        lat: row.lat,
        lng: row.lng,
        distance_km: formatDistanceKm(row.distance_km),
        product_needs: dataProduct,
        created_at: row.created_at,
        update_at: row.update_at,
      };

      return misc.response(res, 200, false, 'OK', {
        item: item,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // POST /mosque
  create: async (req, res) => {
    try {
      const {
        name,
        description,
        path,
        detail_address,
        province,
        city,
        district,
        subdistrict,
        zip_code,
        lat,
        lng,
      } = req.body;

      if (!name) return misc.response(res, 400, true, 'nama wajib diisi');
      if (!description) return misc.response(res, 400, true, 'deskripsi wajib diisi');
      if (!path) return misc.response(res, 400, true, 'path wajib diisi');
      if (!detail_address) return misc.response(res, 400, true, 'detail alamat wajib diisi');
      if (!province) return misc.response(res, 400, true, 'provinsi wajib diisi');
      if (!city) return misc.response(res, 400, true, 'city wajib diisi');
      if (!district) return misc.response(res, 400, true, 'district wajib diisi');
      if (!subdistrict) return misc.response(res, 400, true, 'subdistrict wajib diisi');
      if (!zip_code) return misc.response(res, 400, true, 'zip_code wajib diisi');
      if (!lat) return misc.response(res, 400, true, 'lat wajib diisi');
      if (!lng) return misc.response(res, 400, true, 'lng wajib diisi');

      const created = await Mosque.create({
        name,
        description,
        path,
        detail_address,
        province,
        city,
        district,
        subdistrict,
        zip_code,
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

  // PUT /mosque/:id
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        path,
        detail_address,
        province,
        city,
        district,
        subdistrict,
        zip_code,
        lat,
        lng,
      } = req.body;

      const exists = await Mosque.detail(id);
      if (!exists) return misc.response(res, 404, true, 'Masjid tidak ditemukan');

      const updated = await Mosque.update(id, {
        name,
        description,
        path,
        detail_address,
        province,
        city,
        district,
        subdistrict,
        zip_code,
        lat,
        lng,
      });

      if (!updated?.affectedRows) return misc.response(res, 400, true, 'Failed to update');

      const row = await Mosque.detail(id);

      return misc.response(res, 200, false, 'Updated', {
        item: row ? toMosqueResponse(row) : null,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // POST /mosque/assign-product
  assignProduct: async (req, res) => {
    const { product_id, mosque_id } = req.body;
    try {
      const exists = await Mosque.detail(mosque_id);
      if (!exists) return misc.response(res, 404, true, 'Masjid tidak ditemukan');

      await Mosque.assignProduct(mosque_id, product_id);

      return misc.response(res, 201, false, 'Assigned', {});
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // PUT /mosque/toggle-product
  toggleProduct: async (req, res) => {
    const { product_id, mosque_id } = req.params;
    const { is_active } = req.body;

    try {
      await Mosque.toggleActiveProduct(is_active, product_id, mosque_id);

      return misc.response(res, 200, false, 'Toggle Product', {});
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
      if (!exists) return misc.response(res, 404, true, 'Masjid tidak ditemukan');

      const deleted = await Mosque.remove(id);

      if (!deleted.affectedRows) return misc.response(res, 400, true, 'Failed to delete');

      return misc.response(res, 200, false, 'Deleted', {});
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },
};
