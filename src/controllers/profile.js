const misc = require('../helpers/response');
const utils = require('../helpers/utils');
const jwt = require('jsonwebtoken');
const Auth = require('../models/Auth');
const User = require('../models/User');

const { generateOTP } = require('../configs/otp');

module.exports = {
  me: async (req, res) => {
    var userId = req.decoded.id;

    try {
      const user = await User.me(userId);

      if (!user) throw new Error('Pengguna tidak ditemukan');

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
