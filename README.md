# بنك سوريا
- `app/` تطبيق Flutter  |  `server/` الخادم + لوحة الإدارة (`/admin`)
1. شغّل الخادم: `cd server && npm i && ADMIN_EMAIL=.. ADMIN_PASS=.. JWT_SECRET=.. npm start`
2. ارفعه على Render/Railway (HTTPS) ثم في GitHub: Settings > Variables > `API_URL` = رابط الخادم.
3. ارفع المشروع إلى GitHub؛ سيُبنى APK من تبويب Actions.
بيانات الإدارة الافتراضية: admin@banksyria.com / Admin@12345 (غيّرها عبر متغيرات البيئة).
