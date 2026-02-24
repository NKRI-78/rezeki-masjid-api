const misc = require('../helpers/response');
const utils = require('../helpers/utils');
const jwt = require('jsonwebtoken');
const Auth = require('../models/Auth');
const User = require('../models/User');

const { generateOTP } = require('../configs/otp');

module.exports = {
  me: async (req, res) => {
    try {
      //   User.me();

      var userId = req.decoded.id;

      const users = await User.me(userId);

      if (users.length == 0) throw new Error('Pengguna tidak ditemukan');

      var user = users[0];

      misc.response(res, 200, false, '', {
        user: {
          id: user.id,
          name: user.fullname,
          email: user.email,
          phone: user.phone,
          role: user.role == 1 ? 'admin' : 'user',
        },
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
