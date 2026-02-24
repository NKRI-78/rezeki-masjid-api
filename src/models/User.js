const conn = require('../configs/db');

module.exports = {
  me: (userId) => {
    return new Promise((resolve, reject) => {
      var query = `SELECT u.id, u.email, u.role, u.phone, p.fullname, p.avatar
            FROM profiles p
            INNER JOIN users u ON u.id = p.user_id
            WHERE u.id = '${userId}'`;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },

  checkUsers: (userId) => {
    return new Promise((resolve, reject) => {
      var query = `SELECT email FROM users WHERE uid = '${userId}'`;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },

  insert: (userId, fullname) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO profiles (user_id, fullname) 
      VALUES ('${userId}', '${fullname}')`;

      conn.query(query, (e, result) => {
        if (e) return reject(e);
        resolve(result.insertId);
      });
    });
  },
};
