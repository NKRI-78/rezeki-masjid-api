function sanitizeString(value) {
  let v = String(value);

  // remove inline script tags
  v = v.replace(/<\s*script[^>]*>/gi, '');
  v = v.replace(/<\s*\/\s*script\s*>/gi, '');

  // neutralize javascript: URI payloads
  v = v.replace(/javascript\s*:/gi, '');

  return v;
}

function sanitizeAny(input) {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeAny);
  }

  if (typeof input === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = sanitizeAny(v);
    }
    return out;
  }

  return input;
}

function xssSanitizer(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeAny(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeAny(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeAny(req.params);
  }

  next();
}

module.exports = {
  xssSanitizer,
};
