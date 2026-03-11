const misc = require('../helpers/response');
const { toMosqueResponse, formatDistanceKm } = require('../helpers/utils');
const Mosque = require('../models/Mosque');
const Product = require('../models/Product');

function normalizeMosquePaths(inputPath, inputPaths) {
  if (Array.isArray(inputPaths) && inputPaths.length) {
    return inputPaths.map((p) => String(p || '').trim()).filter(Boolean);
  }

  if (typeof inputPath === 'string' && inputPath.trim()) {
    return [inputPath.trim()];
  }

  return [];
}

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

        const medias = await Mosque.getMediaPaths(item.id);
        item.media = (medias || []).map((m) => ({ id: m.id, path: m.path }));
        item.path = item.media?.[0]?.path || item.path || null;

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

      const medias = await Mosque.getMediaPaths(row.id);

      var item = {
        id: row.id,
        name: row.name,
        description: row.description,
        phone: row.phone,
        link: row.link,
        path: medias?.[0]?.path || row.path,
        media: (medias || []).map((m) => ({ id: m.id, path: m.path })),
        detail_address: row.detail_address,
        province: row.province,
        city: row.city,
        district: row.district,
        subdistrict: row.subdistrict,
        zip_code: row.zip_code,
        lat: row.lat,
        lng: row.lng,
        distance_km: formatDistanceKm(row.distance_km),
        product_needs: dataProduct,
        created_at: row.created_at,
        updated_at: row.updated_at,
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
        phone,
        path,
        paths,
        detail_address,
        province,
        city,
        district,
        subdistrict,
        zip_code,
        lat,
        lng,
        link,
      } = req.body;

      const decoded = req.decoded;

      if (decoded.role != 'admin') throw new Error('Role bukan admin');

      if (!name) return misc.response(res, 400, true, 'nama wajib diisi');
      if (!description) return misc.response(res, 400, true, 'deskripsi wajib diisi');
      if (!phone) return misc.response(res, 400, true, 'phone wajib diisi');

      const normalizedPaths = normalizeMosquePaths(path, paths);
      if (!normalizedPaths.length)
        return misc.response(res, 400, true, 'paths wajib diisi (minimal 1 gambar)');
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
        phone,
        path,
        paths,
        detail_address,
        province,
        city,
        district,
        subdistrict,
        zip_code,
        lat,
        lng,
        link,
      });

      await Mosque.replaceMediaPaths(created.id, normalizedPaths);

      const row = await Mosque.detail(created.id);
      const medias = row ? await Mosque.getMediaPaths(row.id) : [];

      return misc.response(res, 201, false, 'Created', {
        item: row
          ? {
              ...toMosqueResponse(row),
              path: medias?.[0]?.path || row.path,
              media: (medias || []).map((m) => ({ id: m.id, path: m.path })),
            }
          : null,
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
        phone,
        path,
        paths,
        detail_address,
        province,
        city,
        district,
        subdistrict,
        zip_code,
        lat,
        lng,
        link,
      } = req.body;

      const decoded = req.decoded;

      if (decoded.role != 'admin') throw new Error('Role bukan admin');

      const exists = await Mosque.detail(id);
      if (!exists) return misc.response(res, 404, true, 'Masjid tidak ditemukan');

      const normalizedPaths = normalizeMosquePaths(path, paths);

      const updated = await Mosque.update(id, {
        name,
        description,
        phone,
        path: normalizedPaths[0] || exists.path,
        paths,
        detail_address,
        province,
        city,
        district,
        subdistrict,
        zip_code,
        lat,
        lng,
        link,
      });

      if (!updated?.affectedRows) return misc.response(res, 400, true, 'Failed to update');

      if (normalizedPaths.length) {
        await Mosque.replaceMediaPaths(id, normalizedPaths);
      }

      const row = await Mosque.detail(id);
      const medias = row ? await Mosque.getMediaPaths(row.id) : [];

      return misc.response(res, 200, false, 'Updated', {
        item: row
          ? {
              ...toMosqueResponse(row),
              path: medias?.[0]?.path || row.path,
              media: (medias || []).map((m) => ({ id: m.id, path: m.path })),
            }
          : null,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // POST /mosque/assign-product
  assignProduct: async (req, res) => {
    const { items } = req.body;

    try {
      const decoded = req.decoded;

      if (decoded.role != 'admin') throw new Error('Role bukan admin');

      if (typeof items == 'undefined' || items.length == 0)
        throw new Error('items tidak boleh kosong');

      for (const i in items) {
        var item = items[i];

        if (typeof item.product_id == 'undefined' || item.product_id == '')
          throw new Error('product_id wajib diisi');

        if (typeof item.mosque_id == 'undefined' || item.mosque_id == '')
          throw new Error('mosque_id wajib diisi');

        if (typeof item.stock == 'undefined' || item.stock == '')
          throw new Error('stock wajib diisi');

        var productId = item.product_id;
        var mosqueId = item.mosque_id;
        var stock = item.stock;

        const exists = await Mosque.detail(mosqueId);
        if (!exists) return misc.response(res, 404, true, 'Masjid tidak ditemukan');

        await Mosque.assignProduct({ mosqueId, productId, stock });
      }

      return misc.response(res, 201, false, 'Assigned Product', {});
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
      const decoded = req.decoded;

      if (decoded.role != 'admin') throw new Error('Role bukan admin');

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

      const decoded = req.decoded;

      if (decoded.role != 'admin') throw new Error('Role bukan admin');

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
