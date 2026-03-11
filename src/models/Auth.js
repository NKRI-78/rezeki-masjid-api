const conn = require('../configs/db');

module.exports = {
  login: (val) => {
    return new Promise((resolve, reject) => {
      var query = `SELECT p.avatar, u.id, u.phone, u.is_active, r.name AS role, u.email, u.password, p.fullname
            FROM users u
            INNER JOIN profiles p ON u.id = p.user_id
            INNER JOIN roles r ON r.id = u.role
            WHERE u.email = ? OR u.phone = ?`;
      conn.query(query, [val, val], (e, result) => {
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
            WHERE email = ?`;
      conn.query(query, [email], (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },

  register: (otp, phone, email, password) => {
    return new Promise((resolve, reject) => {
      var query = `INSERT INTO users (otp, phone, email, role, password) 
            VALUES (?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE created_at = NOW()`;
      // Force role user (id=2), do not trust role from client payload
      conn.query(query, [otp, phone, email, 2, password], (e, result) => {
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
      const query = `SELECT email, password FROM users WHERE email = ?`;
      conn.query(query, [email], (e, res) => {
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
      const query = `SELECT email FROM users WHERE email = ? AND is_active = 'enabled'`;
      conn.query(query, [email], (e, res) => {
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
      const query = `SELECT phone FROM users WHERE phone = ?`;
      conn.query(query, [phone], (e, res) => {
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
      const query = `INSERT INTO users (email, otp) VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE email = VALUES(email), otp = VALUES(otp), created_at = NOW()`;
      conn.query(query, [email, otp], (e, res) => {
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
      const query = `SELECT u.id, u.otp, u.email, u.phone, p.fullname, r.name AS role, COALESCE(u.updated_at, u.created_at) AS otp_created_at
                FROM users u
                INNER JOIN profiles p
                ON u.id = p.user_id
                INNER JOIN roles r ON r.id = u.role
                WHERE u.email = ? 
                AND u.otp = ? 
                AND u.is_active = 'disabled'`;
      conn.query(query, [email, otp], (e, res) => {
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
            SET otp = ?, created_at = NOW(), updated_at = NOW()
            WHERE email = ?`;
      conn.query(query, [otp, email], (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },

  checkActiveEmail: (email) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT id, email, is_active FROM users WHERE email = ? AND is_active = 'enabled' LIMIT 1`;
      conn.query(query, [email], (e, res) => {
        if (e) reject(new Error(e));
        else resolve(res || []);
      });
    });
  },

  verifyForgotOtp: (email, otp) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT id, email, otp, COALESCE(updated_at, created_at) AS otp_created_at FROM users WHERE email = ? AND otp = ? AND is_active = 'enabled' LIMIT 1`;
      conn.query(query, [email, otp], (e, res) => {
        if (e) reject(new Error(e));
        else resolve(res || []);
      });
    });
  },

  updatePasswordByEmail: (email, passwordHash) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE users SET password = ?, otp = NULL, updated_at = NOW() WHERE email = ?`;
      conn.query(query, [passwordHash, email], (e, res) => {
        if (e) reject(new Error(e));
        else resolve(res);
      });
    });
  },

  resendOtp: (email, otp) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE users
            SET otp = ?, created_at = NOW(), updated_at = NOW()
            WHERE email = ?`;
      conn.query(query, [otp, email], (e, res) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(res);
        }
      });
    });
  },
};
