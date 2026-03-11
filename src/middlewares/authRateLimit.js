const misc = require('../helpers/response');

const attempts = new Map();

function toInt(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim() !== '') {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function keyFrom(req) {
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const ip = getIp(req);
  return `${email}|${ip}`;
}

function cleanup(now, windowMs) {
  for (const [k, rec] of attempts.entries()) {
    if (rec.blockedUntil && now > rec.blockedUntil) {
      attempts.delete(k);
      continue;
    }

    if (!rec.blockedUntil && now - rec.firstAt > windowMs) {
      attempts.delete(k);
    }
  }
}

function loginRateLimit(req, res, next) {
  const maxAttempts = toInt(process.env.LOGIN_MAX_ATTEMPTS, 5);
  const windowMinutes = toInt(process.env.LOGIN_WINDOW_MINUTES, 15);
  const lockMinutes = toInt(process.env.LOGIN_LOCK_MINUTES, 15);

  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  cleanup(now, windowMs);

  const key = keyFrom(req);
  const rec = attempts.get(key);

  if (rec && rec.blockedUntil && now < rec.blockedUntil) {
    return misc.response(res, 429, true, 'Terlalu banyak percobaan login. Coba lagi nanti');
  }

  req._loginRateKey = key;
  req._loginRateConfig = { maxAttempts, lockMinutes, windowMs };
  return next();
}

function markLoginFailure(req) {
  const key = req._loginRateKey || keyFrom(req);
  const cfg = req._loginRateConfig || {
    maxAttempts: toInt(process.env.LOGIN_MAX_ATTEMPTS, 5),
    lockMinutes: toInt(process.env.LOGIN_LOCK_MINUTES, 15),
    windowMs: toInt(process.env.LOGIN_WINDOW_MINUTES, 15) * 60 * 1000,
  };

  const now = Date.now();
  const rec = attempts.get(key);

  if (!rec || now - rec.firstAt > cfg.windowMs) {
    attempts.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
    return;
  }

  rec.count += 1;
  if (rec.count >= cfg.maxAttempts) {
    rec.blockedUntil = now + cfg.lockMinutes * 60 * 1000;
  }
  attempts.set(key, rec);
}

function clearLoginFailure(req) {
  const key = req._loginRateKey || keyFrom(req);
  attempts.delete(key);
}

module.exports = {
  loginRateLimit,
  markLoginFailure,
  clearLoginFailure,
};
