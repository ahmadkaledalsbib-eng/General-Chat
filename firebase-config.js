/*
 الإعداد (مرة واحدة):
 1) console.firebase.google.com ← مشروع جديد ← أضف تطبيق ويب ← تم ربط القيم أدناه.
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

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBslRluFphGEHmrLkSrzIgFfR57Xwmc2LE",
  authDomain: "wallet-dcd19.firebaseapp.com",
  projectId: "wallet-dcd19",
  storageBucket: "wallet-dcd19.firebasestorage.app",
  messagingSenderId: "823442052558",
  appId: "1:823442052558:web:e31d822a8f1f9cd81c879f",
  measurementId: "G-9MXCWMCPYE"
};

// حفظ الإعدادات على النافذة العامة لضمان التوافق مع الكود السابق
window.FB_CFG = firebaseConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
