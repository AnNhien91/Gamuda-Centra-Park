# Gamuda Central Park — Website dự án

Landing page cao cấp cho dự án bất động sản **Gamuda Central Park**, chạy bằng **Node.js (Express)**, có form đăng ký tư vấn.

> ⚠️ **Nội dung hiện tại là nội dung MẪU** (số liệu, vị trí, tiện ích, giá, ảnh Unsplash). Cần thay bằng thông tin chính thức trước khi chạy quảng cáo. Xem mục [Sửa nội dung](#sửa-nội-dung).

## Tính năng

- Thiết kế sáng, xanh thiên nhiên: kem ấm + xanh rêu + điểm nhấn đồng, font Cormorant Garamond & Be Vietnam Pro (hỗ trợ đầy đủ tiếng Việt)
- Các phần: Hero toàn màn hình · Tổng quan · Công viên 15 ha · Vị trí (sơ đồ kết nối SVG) · Tiện ích (bento) · Sản phẩm (tab) · Thư viện ảnh (lightbox) · Chủ đầu tư · Form đăng ký · Footer
- Nút Zalo / Hotline nổi, menu mobile, header kính mờ khi cuộn
- Hiệu ứng cuộn, đếm số, parallax; tự tắt khi người dùng bật "giảm chuyển động"
- Chuẩn truy cập: điều hướng bàn phím, ARIA cho tab và lightbox, độ tương phản ≥ 4.5:1
- SEO: meta, Open Graph, JSON-LD
- Form: kiểm tra lỗi ngay tại ô nhập, chống spam (honeypot + giới hạn 5 lần/10 phút), lưu file `data/leads.jsonl`, gửi email qua SMTP, đẩy sang Google Sheets (tuỳ chọn)
- Không phụ thuộc framework front-end, trang nhẹ, tải nhanh

## Chạy trên máy

Yêu cầu Node.js 18 trở lên.

```bash
npm install
cp .env.example .env     # rồi điền thông tin SMTP / Google Sheets nếu cần
npm run dev              # http://localhost:3000
```

## Cấu trúc

```
server.js                 Express server + API /api/leads
public/                   Website (HTML, CSS, JS, ảnh)
  index.html
  css/styles.css          Design tokens ở đầu file (:root)
  js/main.js              Tương tác, form
  js/config.js            Địa chỉ gửi form
scripts/build.js          Build bản tĩnh ra dist/ (cho hosting không có Node.js)
google-apps-script/       Script nhận lead vào Google Sheets
data/                     Lead lưu tại đây (không đưa lên GitHub)
```

## Đưa lên GitHub

```bash
git init
git add .
git commit -m "Gamuda Central Park website"
git branch -M main
git remote add origin https://github.com/<tai-khoan>/gamuda-central-park.git
git push -u origin main
```

File `.env` và thư mục `data/` đã nằm trong `.gitignore`, nên mật khẩu và danh sách khách hàng không bị đưa lên GitHub.

## Deploy lên Hostinger

### Cách A: gói Business / Cloud (có mục Node.js Web App) — khuyên dùng

1. hPanel → **Websites** → **Add Website** → **Node.js Web App**.
2. Chọn **Import Git Repository**, kết nối GitHub và chọn repo `gamuda-central-park`, nhánh `main`.
3. Cấu hình build:
   - Framework: **Express** (hoặc Other)
   - Node version: **20.x** trở lên
   - Install command: `npm install`
   - Build command: *(để trống)*
   - Entry file / Start command: `server.js` / `npm start`
4. Mục **Environment variables**: thêm các biến trong `.env.example` (`NODE_ENV=production`, `SMTP_*`, `LEAD_EMAIL_TO`, `SHEETS_WEBHOOK_URL`). Không cần đặt `PORT`, Hostinger tự cấp.
5. Bấm **Deploy**, sau đó gắn tên miền và bật SSL miễn phí.
6. Mỗi lần `git push` lên `main`, Hostinger sẽ tự deploy lại (nếu đã bật auto-deploy).

> Trên gói này ổ đĩa có thể bị làm mới sau mỗi lần deploy, nên file `data/leads.jsonl` có thể mất. Hãy bật **email** và/hoặc **Google Sheets** để lưu lead lâu dài.

### Cách B: VPS Hostinger

```bash
# trên VPS (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs nginx
git clone https://github.com/<tai-khoan>/gamuda-central-park.git && cd gamuda-central-park
npm ci --omit=dev && cp .env.example .env && nano .env
sudo npm i -g pm2 && pm2 start server.js --name gcp && pm2 save && pm2 startup
```

Cấu hình Nginx reverse proxy `proxy_pass http://127.0.0.1:3000;` rồi cấp SSL bằng `sudo certbot --nginx`.
Cập nhật code: `git pull && npm ci --omit=dev && pm2 restart gcp`.

### Cách C: gói Shared thường (Single / Premium, không có Node.js)

1. Tạo endpoint Google Sheets theo hướng dẫn trong `google-apps-script/Code.gs`.
2. Trong `.env`, đặt `FORM_ENDPOINT=https://script.google.com/macros/s/.../exec`.
3. Chạy `npm run build`, lệnh này tạo thư mục `dist/` kèm sẵn `.htaccess`.
4. hPanel → **File Manager** → `public_html` → upload **toàn bộ nội dung** bên trong `dist/`.
   Hoặc dùng hPanel → **Advanced → GIT** để kéo repo về, nhưng khi đó phải commit thư mục `dist/` (bỏ dòng `dist/` khỏi `.gitignore`).

## Sửa nội dung

| Muốn sửa | Ở đâu |
|---|---|
| Chữ, số liệu, giá, tiện ích | `public/index.html` (các phần được đánh dấu bằng comment `=== TÊN PHẦN ===`) |
| Hotline / Zalo / email | Tìm `0900000000`, `0900 000 000` và `yourdomain.com` trong `public/index.html` |
| Màu sắc, font, khoảng cách | Biến trong `:root` ở đầu `public/css/styles.css` |
| Ảnh | Thay URL Unsplash bằng ảnh thật trong `public/img/` (nên dùng WebP, rộng 1600–2400px) |
| Tên miền cho SEO | Thẻ `canonical`, `og:image` và JSON-LD trong `<head>` |

Nếu dùng ảnh hoặc logo chính thức của chủ đầu tư, hãy đảm bảo đã được cho phép sử dụng.

## Kiểm tra nhanh

```bash
npm run check                                   # kiểm tra cú pháp
curl -X POST localhost:3000/api/leads -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"0901234567","consent":true}'
```
