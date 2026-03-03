const axios = require('axios');
const Order = require('../models/Order');

function isDeliveredTracking(data) {
  if (!data) return false;

  const podStatus = String(data?.cnote?.pod_status || '').toUpperCase();
  if (podStatus === 'DELIVERED') return true;

  const lastStatus = String(data?.cnote?.last_status || '').toUpperCase();
  if (lastStatus.includes('DELIVERED')) return true;

  const history = Array.isArray(data?.history) ? data.history : [];
  if (history.some((h) => String(h?.code || '').toUpperCase() === 'D01')) return true;
  if (history.some((h) => String(h?.desc || '').toUpperCase().includes('DELIVERED'))) return true;

  return false;
}

async function fetchTrackingByAwb(awb) {
  const trackingUrlTemplate = process.env.TRACKING_JNE;
  if (!trackingUrlTemplate) throw new Error('TRACKING_JNE belum diset di env');

  const trackingUrl = trackingUrlTemplate.replace('{AWB}', encodeURIComponent(awb));
  const body = new URLSearchParams({
    username: process.env.USERNAME_JNE,
    api_key: process.env.KEY_API_JNE,
  }).toString();

  const res = await axios({
    method: 'POST',
    url: trackingUrl,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    data: body,
    timeout: 20000,
  });

  return res?.data;
}

async function runOrderTrackingCron() {
  const useDummyTracking = String(process.env.TRACKING_DUMMY || '').toLowerCase() === 'true';
  if (useDummyTracking) {
    console.log('[CRON][tracking] skip because TRACKING_DUMMY=true');
    return;
  }

  const rows = await Order.listTrackableForDelivery();
  if (!rows.length) {
    console.log('[CRON][tracking] no process orders with waybill');
    return;
  }

  let deliveredCount = 0;

  for (const row of rows) {
    try {
      const tracking = await fetchTrackingByAwb(row.waybill);
      if (isDeliveredTracking(tracking)) {
        await Order.markDelivered(row.invoice);
        deliveredCount += 1;
        console.log(`[CRON][tracking] delivered -> ${row.invoice} (${row.waybill})`);
      }
    } catch (err) {
      console.log(`[CRON][tracking] error invoice=${row.invoice}:`, err?.message || err);
    }
  }

  console.log(`[CRON][tracking] done. checked=${rows.length}, delivered=${deliveredCount}`);
}

function startOrderTrackingCron() {
  const enabled = String(process.env.TRACKING_CRON_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[CRON][tracking] disabled by TRACKING_CRON_ENABLED=false');
    return;
  }

  const intervalMs = Number(process.env.TRACKING_CRON_INTERVAL_MS || 30 * 60 * 1000);

  setTimeout(() => {
    runOrderTrackingCron().catch((e) => console.log('[CRON][tracking] first run error:', e?.message));
  }, 15000);

  setInterval(() => {
    runOrderTrackingCron().catch((e) => console.log('[CRON][tracking] run error:', e?.message));
  }, intervalMs);

  console.log(`[CRON][tracking] started interval=${intervalMs}ms`);
}

module.exports = { startOrderTrackingCron, runOrderTrackingCron };
