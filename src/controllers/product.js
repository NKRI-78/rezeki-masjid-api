const misc = require('../helpers/response');
const Product = require('../models/Product');

function normalizeProductPaths(inputPath, inputPaths) {
  if (Array.isArray(inputPaths) && inputPaths.length) {
    return inputPaths.map((p) => String(p || '').trim()).filter(Boolean);
  }

  if (typeof inputPath === 'string' && inputPath.trim()) return [inputPath.trim()];
  return [];
}

module.exports = {
  // GET /products?page=1&limit=10&search=abc
  list: async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const search = req.query.search || '';

      const [rows, total] = await Promise.all([
        Product.list({ page, limit, search }),
        Product.count({ search }),
      ]);

      const p = Number(page) || 1;
      const l = Number(limit) || 10;
      const totalPages = l === 0 ? 0 : Math.ceil(total / l);

      var items = [];

      for (const i in rows) {
        var row = rows[i];

        var media = await Product.getMedia({ product_id: row.id });

        items.push({
          id: row.id,
          title: row.title,
          media: media,
          path: media?.[0]?.path || null,
          content: row.content,
          price: row.price,
          stock: row.stock,
          weight: row.weight,
          created_at: row.created_at,
          updated_at: row.updated_at,
          store: row.shop_id
            ? {
                id: row.shop_id,
                name: row.shop_name,
                is_active: row.shop_active,
              }
            : null,
        });
      }

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

  // POST /products/media
  media: async (req, res) => {
    try {
      const { product_id, path } = req.body;

      if (product_id === undefined || product_id == null)
        return misc.response(res, 400, true, 'product_id wajib diisi');
      if (path === undefined || path === null)
        return misc.response(res, 400, true, 'path wajib diisi');

      await Product.media({ product_id, path });

      return misc.response(res, 200, false, 'OK');
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // GET /products/:id
  detail: async (req, res) => {
    try {
      const { id } = req.params;

      const row = await Product.detail(id);
      if (!row) return misc.response(res, 404, true, 'Produk tidak ditemukan');

      var media = await Product.getMedia({ product_id: row.id });

      var data = {
        id: row.id,
        title: row.title,
        media: media,
        path: media?.[0]?.path || null,
        content: row.content,
        price: row.price,
        stock: row.stock,
        weight: row.weight,
        created_at: row.created_at,
        updated_at: row.updated_at,
        store: row.shop_id
          ? {
              id: row.shop_id,
              name: row.shop_name,
              is_active: row.shop_active,
            }
          : null,
      };

      return misc.response(res, 200, false, 'OK', {
        item: data,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // POST /products
  create: async (req, res) => {
    try {
      const { title, content, price, stock, weight, shop_id, path, paths } = req.body;

      // Validasi minimal
      if (!title) return misc.response(res, 400, true, 'title wajib diisi');
      if (price === undefined || price === null)
        return misc.response(res, 400, true, 'harga wajib diisi');
      if (!shop_id) return misc.response(res, 400, true, 'shop_id wajib diisi');

      const normalizedPaths = normalizeProductPaths(path, paths);
      if (!normalizedPaths.length)
        return misc.response(res, 400, true, 'paths wajib diisi (minimal 1 gambar)');

      const created = await Product.create({ title, content, price, stock, weight, shop_id });
      await Product.replaceMediaPaths({ product_id: created.id, paths: normalizedPaths });

      const row = await Product.detail(created.id);
      const media = row ? await Product.getMedia({ product_id: row.id }) : [];

      return misc.response(res, 201, false, 'Created', {
        item: row
          ? {
              id: row.id,
              title: row.title,
              media,
              path: media?.[0]?.path || null,
              content: row.content,
              price: row.price,
              stock: row.stock,
              weight: row.weight,
              created_at: row.created_at,
              updated_at: row.updated_at,
              store: row.shop_id
                ? {
                    id: row.shop_id,
                    name: row.shop_name,
                    is_active: row.shop_active,
                  }
                : null,
            }
          : null,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // PUT /products/:id
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, price, stock, weight, shop_id, path, paths } = req.body;

      const exists = await Product.detail(id);
      if (!exists) return misc.response(res, 404, true, 'Produk tidak ditemukan');

      const updated = await Product.update(id, { title, content, price, stock, weight, shop_id });
      if (!updated.affectedRows) return misc.response(res, 400, true, 'Failed to update');

      const normalizedPaths = normalizeProductPaths(path, paths);
      if (normalizedPaths.length) {
        await Product.replaceMediaPaths({ product_id: id, paths: normalizedPaths });
      }

      const row = await Product.detail(id);
      const media = row ? await Product.getMedia({ product_id: row.id }) : [];

      return misc.response(res, 200, false, 'Updated', {
        item: row
          ? {
              id: row.id,
              title: row.title,
              media,
              path: media?.[0]?.path || null,
              content: row.content,
              price: row.price,
              stock: row.stock,
              weight: row.weight,
              created_at: row.created_at,
              updated_at: row.updated_at,
              store: row.shop_id
                ? {
                    id: row.shop_id,
                    name: row.shop_name,
                    is_active: row.shop_active,
                  }
                : null,
            }
          : null,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // DELETE /products/:id
  remove: async (req, res) => {
    try {
      const { id } = req.params;

      const exists = await Product.detail(id);
      if (!exists) return misc.response(res, 404, true, 'Produk tidak ditemukan');

      const deleted = await Product.remove(id);
      if (!deleted.affectedRows) return misc.response(res, 400, true, 'Failed to delete');

      return misc.response(res, 200, false, 'Deleted', {});
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },
};
