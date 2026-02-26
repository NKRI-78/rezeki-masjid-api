const misc = require('../helpers/response');
const Administration = require('../models/Administration');
const Banner = require('../models/Banner');

module.exports = {
  province: async (_, res) => {
    try {
      const data = await Administration.provinces();

      misc.response(res, 200, false, 'OK', data);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  city: async (req, res) => {
    try {
      const { province_name } = req.params;

      const data = await Administration.cities(province_name);

      misc.response(res, 200, false, 'OK', data);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  district: async (req, res) => {
    try {
      const { city_name } = req.params;

      const data = await Administration.districts(city_name);

      misc.response(res, 200, false, 'OK', data);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  subdistrict: async (req, res) => {
    try {
      const { district_name } = req.params;

      const data = await Administration.subdistricts(district_name);

      misc.response(res, 200, false, 'OK', data);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
