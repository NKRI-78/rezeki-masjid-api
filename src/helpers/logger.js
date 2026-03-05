// src/helpers/logger.js
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const LOG_LEVEL = 'info';
const LOG_DIR = path.resolve(process.cwd(), 'logs');

try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {}

const consoleTransport = new transports.Console({
  level: LOG_LEVEL,
  format: format.combine(
    format.colorize({ all: true }),
    format.timestamp(),
    format.printf(({ level, message, timestamp, ...meta }) => {
      const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${moment(timestamp).format('YYYY-MM-DD HH:mm:ss')} ${level}: ${message}${rest}`;
    }),
  ),
});

const fileTransport = new DailyRotateFile({
  level: LOG_LEVEL,
  dirname: LOG_DIR,
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxFiles: '14d',
  format: format.combine(format.timestamp(), format.json()),
});

const logger = createLogger({
  level: LOG_LEVEL,
  format: format.combine(format.timestamp(), format.json()),
  transports: [consoleTransport, fileTransport],
  exceptionHandlers: [new transports.File({ filename: path.join(LOG_DIR, 'exceptions.log') })],
  rejectionHandlers: [new transports.File({ filename: path.join(LOG_DIR, 'rejections.log') })],
});

logger.stream = {
  write: (msg) => logger.info(msg.trim()),
};

// Self-test (optional): aktifkan kalau perlu verifikasi init
// logger.info("logger.selftest", { where: "helpers/logger", pid: process.pid, LOG_DIR });

module.exports = logger;
