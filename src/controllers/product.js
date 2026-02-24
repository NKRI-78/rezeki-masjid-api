const misc = require('../helpers/response');
const Product = require('../models/Product');

function toProductResponse(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    price: row.price,
    stock: row.stock,
    created_at: row.created_at,
    update_at: row.update_at,
    mosque: row.mosque_id
      ? {
          id: row.mosque_id,
          name: row.mosque_name,
          path: row.mosque_path,
          detail_address: row.mosque_detail_address,
          lat: row.mosque_lat,
          lng: row.mosque_lng,
        }
      : null,
  };
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

      const items = rows.map(toProductResponse);

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

  // GET /products/:id
  detail: async (req, res) => {
    try {
      const { id } = req.params;

      const row = await Product.detail(id);
      if (!row) return misc.response(res, 404, true, 'Product not found');

      return misc.response(res, 200, false, 'OK', {
        item: toProductResponse(row),
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // POST /products
  create: async (req, res) => {
    try {
      const { title, content, price, stock, mosque_id } = req.body;

      // Validasi minimal
      if (!title) return misc.response(res, 400, true, 'title is required');
      if (price === undefined || price === null)
        return misc.response(res, 400, true, 'price is required');
      if (!mosque_id) return misc.response(res, 400, true, 'mosque_id is required');

      const created = await Product.create({ title, content, price, stock, mosque_id });

      // Ambil detail setelah insert supaya response nested mosque ikut kebawa
      const row = await Product.detail(created.id);

      return misc.response(res, 201, false, 'Created', {
        item: row ? toProductResponse(row) : null,
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
      const { title, content, price, stock, mosque_id } = req.body;

      const exists = await Product.detail(id);
      if (!exists) return misc.response(res, 404, true, 'Product not found');

      const updated = await Product.update(id, { title, content, price, stock, mosque_id });
      if (!updated.affectedRows) return misc.response(res, 400, true, 'Failed to update');

      const row = await Product.detail(id);

      return misc.response(res, 200, false, 'Updated', {
        item: row ? toProductResponse(row) : null,
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
      if (!exists) return misc.response(res, 404, true, 'Product not found');

      const deleted = await Product.remove(id);
      if (!deleted.affectedRows) return misc.response(res, 400, true, 'Failed to delete');

      return misc.response(res, 200, false, 'Deleted', {});
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },
};
