/**
 * Build bản TĨNH (dist/) cho hosting thường của Hostinger (không có Node.js).
 *   npm run build  ->  upload toàn bộ nội dung thư mục dist/ vào public_html
 *
 * Form sẽ gửi tới FORM_ENDPOINT trong .env (ví dụ URL Google Apps Script).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'dist');
const endpoint = (process.env.FORM_ENDPOINT || '').trim();

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });

if (!endpoint) {
  console.warn('\n⚠  Chưa đặt FORM_ENDPOINT trong .env — form trên bản tĩnh sẽ không gửi được.');
  console.warn('   Xem hướng dẫn tạo endpoint Google Sheets trong google-apps-script/Code.gs\n');
}

fs.writeFileSync(
  path.join(OUT, 'js', 'config.js'),
  `/* Tạo tự động bởi scripts/build.js */
document.documentElement.classList.add("js");
window.SITE_CONFIG = {
  formEndpoint: ${JSON.stringify(endpoint || '/api/leads')}
};
`
);

// .htaccess cho Apache/LiteSpeed (Hostinger): HTTPS, nén, cache, 404, header bảo mật
fs.writeFileSync(
  path.join(OUT, '.htaccess'),
  `# Tạo tự động bởi scripts/build.js
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

ErrorDocument 404 /404.html
Options -Indexes

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  <FilesMatch "\\.(html)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "\\.(css|js|svg|png|jpg|jpeg|webp|avif|woff2)$">
    Header set Cache-Control "public, max-age=604800"
  </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>
`
);

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .reduce((n, d) => n + (d.isDirectory() ? count(path.join(dir, d.name)) : 1), 0);
console.log(`✓ Đã build ${count(OUT)} file vào dist/  (form endpoint: ${endpoint || '/api/leads'})`);
