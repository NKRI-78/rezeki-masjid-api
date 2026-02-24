const conn = require('../configs/db');

module.exports = {
  login: (val) => {
    return new Promise((resolve, reject) => {
      var query = `SELECT p.avatar, u.id, u.phone, u.is_active, r.name AS role, u.email, u.password, p.fullname
            FROM users u
            INNER JOIN profiles p ON u.id = p.user_id
            INNER JOIN roles r ON r.id = u.role
            WHERE u.email = '${val}' OR u.phone = '${val}'`;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },

  verifyOtp: (email) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE users
            SET is_active = 'enabled', 
            updated_at = NOW()
            WHERE email = '${email}'`;
      conn.query(query, (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },

  register: (otp, phone, email, role, password) => {
    return new Promise((resolve, reject) => {
      var query = `INSERT INTO users (otp, phone, email, role, password) 
            VALUES ('${otp}', '${phone}', '${email}', '${role}', '${password}') 
            ON DUPLICATE KEY UPDATE created_at = NOW()`;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result.insertId);
        }
      });
    });
  },

  checkEmail: (email) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT email, password FROM users WHERE email = '${email}'`;
      conn.query(query, (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },

  isEmailAlreadyActive: (email) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT email FROM users WHERE email = '${email}' AND is_active = 'enabled'`;
      conn.query(query, (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },

  checkPhone: (phone) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT phone FROM users WHERE phone = '${phone}'`;
      conn.query(query, (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },

  insertOtp: (email, otp) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT users (email, otp) VALUES ('${email}', '${otp}') 
            ON DUPLICATE KEY UPDATE email = '${email}', otp = '${otp}', created_at = NOW()`;
      conn.query(query, (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },

  checkOtp: (email, otp) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT u.id, u.otp, u.email, u.phone, p.fullname, u.created_at
                FROM users u
                INNER JOIN profiles p
                ON u.id = p.user_id
                WHERE u.email = '${email}' 
                AND u.otp = '${otp}' 
                AND u.is_active = 'disabled'`;
      conn.query(query, (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },

  updateOtp: (otp, email) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE users 
            SET otp = '${otp}', created_at = NOW(), updated_at = NOW()
            WHERE email = '${email}'`;
      conn.query(query, (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },

  resendOtp: (email, otp) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE users
            SET otp = '${otp}', created_at = NOW()
            WHERE email = '${email}'`;
      conn.query(query, (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },
};
