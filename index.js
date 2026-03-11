const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const logger = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const app = express();
const config = require('./src/configs/configs');
const port = config.port;
const cors = require('cors');
const routerNav = require('./src/index');
const { httpLogger } = require('./src/middlewares/logging');
const { xssSanitizer } = require('./src/middlewares/security');
const { startOrderTrackingCron } = require('./src/jobs/orderTrackingCron');

app.use(fileUpload());
app.use(logger('dev'));
app.use(helmet());

const corsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // non-browser or same-origin server-to-server request
    if (!origin) return callback(null, true);

    if (corsOrigins.length === 0) {
      return callback(new Error('CORS blocked: origin is not allowed'));
    }

    if (corsOrigins.includes(origin)) return callback(null, true);

    return callback(new Error('CORS blocked: origin is not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(xssSanitizer);
app.use(httpLogger());

app.use('/', routerNav);

const server = app.listen(port, () => {
  console.log(`\n\t *** Server listening on PORT ${port}  ***`);
  startOrderTrackingCron();
});

app.use((err, _req, res, next) => {
  if (err && String(err.message || '').includes('CORS blocked')) {
    return res.status(403).json({ status: 403, error: true, message: err.message });
  }

  return next(err);
});

app.all('/*splat', (_, response) => {
  response.sendStatus(404);
});

module.exports = server;
