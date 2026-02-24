const jwt = require('jsonwebtoken');
const misc = require('../helpers/response');

function getBearerToken(req) {
  const auth = req.get('authorization') || req.get('Authorization');
  if (!auth) return null;

  const [scheme, token] = auth.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
  return token || null;
}

function jwtAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return misc.response(res, 401, true, 'No token, authorization denied.');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return misc.response(res, 500, true, 'Server misconfiguration.');
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return misc.response(res, 401, true, 'Token expired.');
      }
      if (err.name === 'JsonWebTokenError') {
        return misc.response(res, 401, true, 'Invalid token.');
      }
      return misc.response(res, 401, true, 'Token verification failed.');
    }

    req.decoded = decoded;
    return next();
  });
}

module.exports = jwtAuth;
