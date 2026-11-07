/* Cấu hình form — file này được ghi đè khi chạy `npm run build` (bản tĩnh).
   - Chạy server Node.js: giữ nguyên "/api/leads".
   - Hosting tĩnh: đặt FORM_ENDPOINT trong .env thành URL Google Apps Script. */
document.documentElement.classList.add("js");
window.SITE_CONFIG = {
  formEndpoint: "/api/leads"
};
