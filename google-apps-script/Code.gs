/**
 * Nhận lead từ website -> ghi vào Google Sheets (+ gửi email báo, tuỳ chọn)
 *
 * CÁCH CÀI:
 * 1. Tạo một Google Sheet mới, đặt tên trang tính là "Leads".
 * 2. Menu Tiện ích mở rộng > Apps Script, xoá code mẫu, dán toàn bộ file này vào.
 * 3. Sửa NOTIFY_EMAIL bên dưới (để trống nếu không cần email báo).
 * 4. Bấm Triển khai > Tuỳ chọn triển khai mới > Loại: Ứng dụng web
 *      - Thực thi dưới dạng: Tôi
 *      - Người có quyền truy cập: Bất kỳ ai
 * 5. Sao chép URL dạng https://script.google.com/macros/s/.../exec
 *      - Chạy server Node.js: dán vào SHEETS_WEBHOOK_URL trong .env
 *      - Bản tĩnh: dán vào FORM_ENDPOINT trong .env rồi chạy `npm run build`
 */
const SHEET_NAME = 'Leads';
const NOTIFY_EMAIL = ''; // ví dụ: 'sales@yourdomain.com'

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.website) return json({ ok: true }); // honeypot

  const sheet = getSheet();
  sheet.appendRow([
    new Date(),
    (p.name || '').slice(0, 80),
    "'" + (p.phone || '').slice(0, 20), // giữ số 0 ở đầu
    (p.email || '').slice(0, 120),
    (p.interest || '').slice(0, 40),
    (p.message || '').slice(0, 1000),
    p.consent === 'true' ? 'Có' : 'Không',
  ]);

  if (NOTIFY_EMAIL) {
    MailApp.sendEmail(
      NOTIFY_EMAIL,
      '[Gamuda Central Park] Khách đăng ký mới: ' + (p.name || '') + ' - ' + (p.phone || ''),
      'Họ tên: ' + p.name + '\nĐiện thoại: ' + p.phone + '\nEmail: ' + (p.email || '—') +
        '\nQuan tâm: ' + p.interest + '\nLời nhắn: ' + (p.message || '—')
    );
  }
  return json({ ok: true });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Thời gian', 'Họ tên', 'Điện thoại', 'Email', 'Quan tâm', 'Lời nhắn', 'Đồng ý liên hệ']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
