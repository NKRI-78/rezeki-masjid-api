const morgan = require('morgan');
const logger = require('../helpers/logger');

// Stream morgan -> winston
const morganToWinston = {
  write: (message) => logger.info(message.trim()),
};

// HTTP logger middleware
function httpLogger() {
  const fmt =
    ':method :url :status :res[content-length] - :response-time ms q=:masked-query b=:masked-body';
  return morgan(fmt, {
    stream: morganToWinston,
    skip: (req) => req.url === '/healthz',
  });
}

// Export semuanya (termasuk logger untuk kompatibilitas jika ada require sebelumnya)
module.exports = { httpLogger, logger };
