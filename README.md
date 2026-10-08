# محفظة الأسد — خطوات الرفع

## 1) Firebase
1. أنشئ مشروعاً في console.firebase.google.com ← أضف تطبيق ويب وانسخ الإعدادات إلى `firebase-config.js` (وانسخه أيضاً إلى `admin/`).
2. Authentication ← Sign-in method ← فعّل Email/Password، ثم أنشئ حساب الإدارة (Users ← Add user) وضع بريده في `ADMIN_EMAIL`.
3. Firestore Database ← أنشئ قاعدة بيانات، ثم Rules ← الصق `firestore.rules` (بعد وضع بريد الإدارة) ← Publish.
4. Authentication ← Settings ← Authorized domains ← أضف `YOURNAME.github.io`.

## 2) GitHub
- **المستودع الأول (التطبيق):** ارفع `index.html` و`shared.js` و`firebase-config.js` و`package.json` و`capacitor.config.json` و`.github/` ثم Settings ← Pages ← Branch: main.
- **المستودع الثاني (لوحة الإدارة، منفصل):** ارفع محتويات مجلد `admin/` فقط، باسم غير معروف، وفعّل Pages.

## 3) ملف APK
Actions ← Build APK ← Run workflow ← حمّل `asad-wallet-apk` من Artifacts. (نسخة debug قابلة للتثبيت مباشرة.)
