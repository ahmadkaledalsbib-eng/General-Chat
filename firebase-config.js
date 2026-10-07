/*
 الإعداد (مرة واحدة):
 1) console.firebase.google.com ← مشروع جديد ← أضف تطبيق ويب ← انسخ القيم أدناه.
 2) Build ← Firestore Database ← Create (production mode).
 3) Build ← Authentication ← Email/Password ← فعّل، ثم أضف مستخدماً (بريدك أنت = الأدمن).
 4) Firestore ← Rules ← الصق التالي (بدّل البريد ببريدك) ثم Publish:

 rules_version = '2';
 service cloud.firestore {
   match /databases/{db}/documents {
     match /config/app {
       allow read: if true;
       allow write: if request.auth != null && request.auth.token.email == 'YOUR_ADMIN_EMAIL';
     }
   }
 }
*/
window.FB_CFG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  appId: "PASTE_APP_ID"
};
