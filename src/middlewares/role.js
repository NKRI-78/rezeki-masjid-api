const misc = require('../helpers/response');

function normalize(role) {
  return String(role || '')
    .trim()
    .toLowerCase();
}

function requireRole(...allowedRoles) {
  const allowed = allowedRoles.map(normalize).filter(Boolean);

  return (req, res, next) => {
    const role = normalize(req?.decoded?.role);

    if (!role) {
      return misc.response(res, 401, true, 'Unauthorized');
    }

    if (!allowed.includes(role)) {
      return misc.response(res, 403, true, 'Forbidden: role not allowed');
    }

    return next();
  };
}

module.exports = {
  requireRole,
  requireAdmin: requireRole('admin'),
};
