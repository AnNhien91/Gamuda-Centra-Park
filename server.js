/**
 * Gamuda Central Park — Node.js server
 * - Phục vụ website tĩnh trong /public (nén gzip, cache, header bảo mật)
 * - POST /api/leads: nhận form đăng ký tư vấn -> lưu file, gửi email (SMTP), đẩy Google Sheets (tuỳ chọn)
 */
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const nodemailer = require('nodemailer');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.jsonl');

// Hostinger / Nginx đứng trước app -> lấy đúng IP khách
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());
app.use(express.json({ limit: '10kb' }));

// ---------- Static ----------
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 ngày
      }
    },
  })
);

// ---------- Rate limit đơn giản (5 lần / 10 phút / IP) ----------
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_HITS;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) {
    if (!list.some((t) => now - t < WINDOW_MS)) hits.delete(ip);
  }
}, WINDOW_MS).unref();

// ---------- Validation ----------
const INTERESTS = ['Căn hộ', 'Nhà phố', 'Biệt thự', 'Chưa xác định'];
const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);

function validateLead(body) {
  const errors = {};
  const lead = {
    name: clean(body.name, 80),
    phone: clean(body.phone, 20).replace(/[\s.\-()]/g, ''),
    email: clean(body.email, 120).toLowerCase(),
    interest: clean(body.interest, 40),
    message: clean(body.message, 1000),
    consent: body.consent === true || body.consent === 'true' || body.consent === 'on',
  };
  if (lead.name.length < 2) errors.name = 'Vui lòng nhập họ tên.';
  if (!/^(\+?84|0)(3|5|7|8|9)\d{8}$/.test(lead.phone)) errors.phone = 'Số điện thoại chưa đúng định dạng.';
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) errors.email = 'Email chưa đúng định dạng.';
  if (!INTERESTS.includes(lead.interest)) lead.interest = 'Chưa xác định';
  if (!lead.consent) errors.consent = 'Vui lòng đồng ý để chúng tôi liên hệ.';
  return { lead, errors };
}

// ---------- Kênh nhận lead ----------
let mailer = null;
if (process.env.SMTP_HOST && process.env.LEAD_EMAIL_TO) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function saveLead(lead) {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  await fs.promises.appendFile(LEADS_FILE, JSON.stringify(lead) + '\n', 'utf8');
}

async function emailLead(lead) {
  if (!mailer) return;
  const rows = [
    ['Họ tên', lead.name],
    ['Điện thoại', lead.phone],
    ['Email', lead.email || '—'],
    ['Quan tâm', lead.interest],
    ['Lời nhắn', lead.message || '—'],
    ['Thời gian', new Date(lead.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })],
  ];
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.LEAD_EMAIL_TO,
    subject: `[Gamuda Central Park] Khách đăng ký mới: ${lead.name} - ${lead.phone}`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
  });
}

async function pushToSheets(lead) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...lead, consent: String(lead.consent) }),
  });
}

app.post('/api/leads', async (req, res) => {
  // Honeypot chống bot: trường "website" phải để trống
  if (req.body && req.body.website) return res.json({ ok: true });
  if (rateLimited(req.ip)) {
    return res.status(429).json({ ok: false, message: 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ít phút.' });
  }

  const { lead, errors } = validateLead(req.body || {});
  if (Object.keys(errors).length) return res.status(422).json({ ok: false, errors });

  lead.createdAt = new Date().toISOString();
  lead.source = clean(req.get('referer'), 200);

  try {
    await saveLead(lead);
  } catch (err) {
    console.error('[lead] save failed', err);
    return res.status(500).json({ ok: false, message: 'Có lỗi khi lưu thông tin. Vui lòng gọi hotline.' });
  }

  // Email & Sheets chạy nền, không bắt khách chờ
  Promise.allSettled([emailLead(lead), pushToSheets(lead)]).then((results) => {
    results.forEach((r) => r.status === 'rejected' && console.error('[lead] notify failed', r.reason));
  });

  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ---------- 404 ----------
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false });
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Gamuda Central Park đang chạy tại http://localhost:${PORT}`);
});
