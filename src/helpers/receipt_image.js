const { createCanvas } = require('canvas');
const QRCode = require('qrcode');
const bwipjs = require('bwip-js');

function rupiah(n) {
  const x = Number(n || 0);
  return x.toLocaleString('id-ID');
}

function safeText(v) {
  return (v ?? '').toString().trim();
}

/**
 * Generate resi label PNG buffer
 * @param {Object} p
 * @returns {Promise<Buffer>}
 */
async function generateReceiptPng(p) {
  const W = 820; // px
  const H = 1200;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // border
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  // header
  ctx.fillStyle = '#000';
  ctx.font = 'bold 34px Arial';
  ctx.fillText('RESI / STRUK PENGIRIMAN', 40, 80);

  ctx.font = '20px Arial';
  ctx.fillText(`Tanggal: ${safeText(p.dateText)}`, 40, 120);
  ctx.fillText(`Invoice: ${safeText(p.invoice)}`, 40, 150);

  // waybill big
  ctx.font = 'bold 40px Arial';
  ctx.fillText(`WAYBILL: ${safeText(p.waybill)}`, 40, 210);

  // barcode
  let barcodePng;
  try {
    barcodePng = await bwipjs.toBuffer({
      bcid: 'code128',
      text: safeText(p.waybill),
      scale: 3,
      height: 18,
      includetext: false,
      backgroundcolor: 'FFFFFF',
    });
  } catch (e) {
    barcodePng = null;
  }

  if (barcodePng) {
    const img = new (require('canvas').Image)();
    img.src = barcodePng;
    ctx.drawImage(img, 40, 240, 520, 110);
  } else {
    ctx.font = '16px Arial';
    ctx.fillText('(barcode gagal dibuat)', 40, 270);
  }

  // QR code (misal tracking url atau waybill)
  const qrText = safeText(p.qrText || p.waybill);
  const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, scale: 6 });
  const qrImg = new (require('canvas').Image)();
  qrImg.src = qrDataUrl;
  ctx.drawImage(qrImg, 620, 230, 160, 160);

  // line separator
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 420);
  ctx.lineTo(W - 40, 420);
  ctx.stroke();

  // sender & receiver blocks
  ctx.font = 'bold 24px Arial';
  ctx.fillText('PENGIRIM (SHOP)', 40, 470);
  ctx.fillText('PENERIMA (MASJID)', 40, 690);

  ctx.font = '20px Arial';
  // sender text
  const senderLines = [
    `Nama: ${safeText(p.senderName)}`,
    `Telp: ${safeText(p.senderPhone)}`,
    `Alamat: ${safeText(p.senderAddress)}`,
    `Kota: ${safeText(p.senderCity)}  ${safeText(p.senderZip) ? `(${safeText(p.senderZip)})` : ''}`,
  ];

  // receiver text
  const receiverLines = [
    `Nama: ${safeText(p.receiverName)}`,
    `Telp: ${safeText(p.receiverPhone)}`,
    `Alamat: ${safeText(p.receiverAddress)}`,
    `Kota: ${safeText(p.receiverCity)}  ${safeText(p.receiverZip) ? `(${safeText(p.receiverZip)})` : ''}`,
  ];

  function drawMultiline(lines, x, y, maxWidth) {
    const lineHeight = 28;
    let cy = y;
    for (const l of lines) {
      const text = safeText(l);
      // wrap sederhana
      const words = text.split(' ');
      let cur = '';
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth) {
          ctx.fillText(cur, x, cy);
          cy += lineHeight;
          cur = w;
        } else {
          cur = test;
        }
      }
      if (cur) {
        ctx.fillText(cur, x, cy);
        cy += lineHeight;
      }
    }
    return cy;
  }

  drawMultiline(senderLines, 40, 510, W - 80);
  drawMultiline(receiverLines, 40, 730, W - 80);

  // separator
  ctx.beginPath();
  ctx.moveTo(40, 920);
  ctx.lineTo(W - 40, 920);
  ctx.stroke();

  // shipment details
  ctx.font = 'bold 24px Arial';
  ctx.fillText('DETAIL PENGIRIMAN', 40, 970);

  ctx.font = '20px Arial';
  const details = [
    `Ekspedisi: ${safeText(p.courier || 'JNE')}`,
    `Service: ${safeText(p.serviceCode)}`,
    `Qty: ${safeText(p.qty)} pcs`,
    `Berat: ${safeText(p.weight)} kg`,
    `Nilai Barang: Rp ${rupiah(p.goodsValue)}`,
  ];
  drawMultiline(details, 40, 1010, W - 80);

  // footer note
  ctx.font = '16px Arial';
  ctx.fillText('Catatan: Simpan resi ini untuk kebutuhan komplain/cek status.', 40, H - 30);

  return canvas.toBuffer('image/png');
}

module.exports = { generateReceiptPng };
