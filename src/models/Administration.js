const conn = require('../configs/db');

module.exports = {
  provinces: () => {
    return new Promise((resolve, reject) => {
      var query = `SELECT province_name FROM jne_destinations 
            GROUP BY province_name`;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },

  cities: (provinceName) => {
    return new Promise((resolve, reject) => {
      var query = `SELECT city_name FROM jne_destinations 
            WHERE province_name = '${provinceName}'
            GROUP BY city_name`;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },

  districts: (cityName) => {
    return new Promise((resolve, reject) => {
      var query = `SELECT district_name FROM jne_destinations 
            WHERE city_name = '${cityName}'
            GROUP BY district_name`;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },

  subdistricts: (districtName) => {
    return new Promise((resolve, reject) => {
      var query = `SELECT subdistrict_name, zip_code FROM jne_destinations 
            WHERE district_name = '${districtName}'
            GROUP BY subdistrict_name`;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },
};
