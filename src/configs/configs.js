require('dotenv/config');

module.exports = {
  database: {
    mysql: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      timezone: '+07:00',
    },
  },
  database_payment: {
    mysql: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      database: 'payment_gateway_langitdigital_dev',
      timezone: '+07:00',
    },
  },
  port: process.env.PORT,
};
