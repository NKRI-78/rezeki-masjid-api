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
const { startOrderTrackingCron } = require('./src/jobs/orderTrackingCron');

app.use(fileUpload());
app.use(logger('dev'));
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(httpLogger());

app.use('/', routerNav);

const server = app.listen(port, () => {
  console.log(`\n\t *** Server listening on PORT ${port}  ***`);
  startOrderTrackingCron();
});

app.all('/*splat', (_, response) => {
  response.sendStatus(404);
});

module.exports = server;
