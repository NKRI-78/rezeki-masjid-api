const misc = require('../helpers/response');
const utils = require('../helpers/utils');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const Auth = require('../models/Auth');
const User = require('../models/User');

const { generateOTP } = require('../configs/otp');

module.exports = {
  login: async (req, res) => {
    const { email, password } = req.body;

    try {
      if (typeof email == 'undefined' || email == '') throw new Error('email wajib diisi');

      if (typeof password == 'undefined' || password == '') throw new Error('password wajib diisi');

      var login = await Auth.login(email);

      if (login.length == 0) throw new Error('Pengguna tidak ditemukan');

      var user = login[0];

      if (user.is_active == 'disabled') {
        var otp = generateOTP();
        await Promise.race([Auth.updateOtp(otp, user.email), utils.sendEmail(user.email, otp)]);
      }

      var passwordHash = await utils.checkPasswordEncrypt(password, user.password);

      if (!passwordHash) throw new Error('password tidak sama');

      var payload = {
        id: user.id,
        authorized: true,
      };

      var token = jwt.sign(payload, process.env.JWT_SECRET);
      var refreshToken = jwt.sign(payload, process.env.JWT_SECRET);

      misc.response(res, 200, false, '', {
        token: token,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          name: user.fullname,
          email: user.email,
          is_active: user.is_active,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  register: async (req, res) => {
    const { fullname, email, password, phone, role } = req.body;

    try {
      if (typeof fullname == 'undefined' || fullname == '') throw new Error('fullname wajib diisi');

      if (typeof email == 'undefined' || email == '') throw new Error('email wajib diisi');

      if (typeof phone == 'undefined' || phone == '') throw new Error('phone wajib diisi');

      if (typeof password == 'undefined' || password == '') throw new Error('password wajib diisi');

      var checkMail = await Auth.checkEmail(email);
      if (checkMail.length != 0) throw new Error(`Pengguna ${checkMail[0].email} sudah ada`);

      var checkPhone = await Auth.checkPhone(phone);
      if (checkPhone.length != 0) throw new Error(`Nomor Ponsel ${checkPhone[0].phone} sudah ada`);

      var otp = generateOTP();

      var passwordHash = await utils.encryptPassword(password);

      await utils.sendEmail(email, otp);

      const insertId = await Auth.register(otp, phone, email, role, passwordHash);

      await User.insert(insertId, fullname);

      var payload = {
        id: insertId,
        authorized: true,
      };

      var token = jwt.sign(payload, process.env.JWT_SECRET);
      var refreshToken = jwt.sign(payload, process.env.JWT_SECRET);

      misc.response(res, 200, false, '', {
        token: token,
        refresh_token: refreshToken,
        user: {
          id: insertId,
          name: fullname,
          email: email,
          is_active: 'disabled',
          phone: phone,
          role: role == 1 ? 'admin' : 'user',
        },
      });
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  verifyOtp: async (req, res) => {
    const { email, otp } = req.body;

    try {
      if (typeof email == 'undefined' || email == '') throw new Error('email wajib diisi');

      if (typeof otp == 'undefined' || otp == '') throw new Error('otp wajib diisi');

      if (!utils.validateEmail(email))
        throw new Error('Invalid format E-mail Address. Etc : johndoe@gmail.com');

      var checkEmail = await Auth.checkEmail(email);

      var isEmailAlreadyActive = await Auth.isEmailAlreadyActive(email);

      if (isEmailAlreadyActive.length != 0) throw new Error('E-mail Address sudah aktif');

      if (checkEmail.length != 0) {
        var checkOtpIsValid = await Auth.checkOtp(email, otp);

        if (checkOtpIsValid.length == 0) throw new Error('OTP salah');

        var currentDate = new Date();
        var otpCreated = checkOtpIsValid[0].created_at;
        var diff = new Date(currentDate.getTime() - otpCreated.getTime());
        if (diff.getMinutes() > 1) {
          misc.response(res, 400, false, 'OTP kadaluwarsa');
        } else {
          await Auth.verifyOtp(email);

          var payload = {
            id: checkOtpIsValid[0].id,
            authorized: true,
          };

          var token = jwt.sign(payload, process.env.JWT_SECRET);
          var refreshToken = jwt.sign(payload, process.env.JWT_SECRET);

          misc.response(res, 200, false, '', {
            token: token,
            refresh_token: refreshToken,
            user: {
              id: checkOtpIsValid[0].uid,
              name: checkOtpIsValid[0].fullname,
              email: checkOtpIsValid[0].email,
              is_active: 'enabled',
              phone: checkOtpIsValid[0].phone,
              role: 'user',
            },
          });
        }
      } else {
        misc.response(res, 400, false, 'Pengguna tidak ditemukan');
      }
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  resendOtp: async (req, res) => {
    const { email } = req.body;

    var otp = generateOTP();

    try {
      if (typeof email == 'undefined' || email == '') throw new Error('email wajib diisi');

      if (!utils.validateEmail(email))
        throw new Error('Invalid format E-mail Address. Etc : johndoe@gmail.com');

      var isEmailAlreadyActive = await Auth.isEmailAlreadyActive(email);

      if (isEmailAlreadyActive.length != 0) throw new Error('Alamat E-mail sudah aktif');

      var checkEmail = await Auth.checkEmail(email);
      if (checkEmail.length == 0) throw new Error(`Pengguna ${email} tidak ditemukan`);

      await Auth.resendOtp(email, otp);

      await utils.sendEmail(email, otp);

      misc.response(
        res,
        200,
        false,
        `Berhasil mengirim ulang OTP, mohon periksa Alamat E-mail ${email}`,
      );
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
