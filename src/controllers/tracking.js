const misc = require('../helpers/response');
const { default: axios } = require('axios');

function buildDummyTracking(waybill = 'DUMMYAWB') {
  const now = new Date();
  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
  };

  const h1 = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const h2 = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const h3 = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  return {
    cnote: {
      cnote_no: waybill,
      reference_number: '-',
      cnote_origin: 'CGK10000',
      cnote_destination: 'CGK99999',
      cnote_services_code: 'REG',
      servicetype: 'REG',
      cnote_cust_no: process.env.USERNAME_JNE || '',
      cnote_date: h1.toISOString(),
      cnote_pod_receiver: null,
      cnote_receiver_name: 'PENERIMA',
      city_name: 'JAKARTA',
      cnote_pod_date: null,
      pod_status: 'ON_PROCESS',
      last_status: `WITH DELIVERY COURIER [${fmt(h3)}]`,
      cust_type: '060',
      cnote_amount: '0',
      cnote_weight: '1',
      pod_code: null,
      keterangan: null,
      cnote_goods_descr: '-',
      freight_charge: '0',
      shippingcost: '0',
      insuranceamount: '0',
      priceperkg: '0',
      signature: null,
      photo: null,
      long: null,
      lat: null,
      estimate_delivery: '1 Days',
    },
    detail: [
      {
        cnote_no: waybill,
        cnote_date: h1.toISOString(),
        cnote_weight: '1',
        cnote_origin: 'CGK10000',
        cnote_shipper_name: 'TOKO REJEKI',
        cnote_shipper_addr1: '-',
        cnote_shipper_addr2: ' ',
        cnote_shipper_addr3: null,
        cnote_shipper_city: 'JAKARTA',
        cnote_receiver_name: 'PENERIMA',
        cnote_receiver_addr1: '-',
        cnote_receiver_addr2: null,
        cnote_receiver_addr3: null,
        cnote_receiver_city: 'JAKARTA',
      },
    ],
    history: [
      {
        date: fmt(h1),
        desc: 'SHIPMENT RECEIVED BY JNE COUNTER OFFICER AT [JAKARTA]',
        code: 'RC1',
      },
      {
        date: fmt(h2),
        desc: 'PICKED UP BY COURIER [JAKARTA]',
        code: 'PU1',
      },
      {
        date: fmt(h3),
        desc: 'WITH DELIVERY COURIER [JAKARTA]',
        code: 'IP3',
      },
    ],
  };
}

module.exports = {
  jne: async (req, res) => {
    try {
      const { waybill, tracking_dummy } = req.body;

      if (!waybill) return misc.response(res, 400, true, 'waybill wajib diisi');

      const useDummyTracking =
        tracking_dummy === true || String(tracking_dummy || '').toLowerCase() === 'true';

      if (useDummyTracking) {
        return misc.response(res, 200, false, 'OK', {
          source: 'dummy',
          tracking: buildDummyTracking(waybill),
        });
      }

      const trackingUrlTemplate = process.env.TRACKING_JNE;
      if (!trackingUrlTemplate) {
        throw new Error('TRACKING_JNE belum diset di env');
      }

      const trackingUrl = trackingUrlTemplate.replace('{AWB}', encodeURIComponent(waybill));

      const body = new URLSearchParams({
        username: process.env.USERNAME_JNE,
        api_key: process.env.KEY_API_JNE,
      }).toString();

      const trackingRes = await axios({
        method: 'POST',
        url: trackingUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        data: body,
      });

      return misc.response(res, 200, false, 'OK', {
        source: 'jne',
        tracking: trackingRes?.data || null,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },
};
