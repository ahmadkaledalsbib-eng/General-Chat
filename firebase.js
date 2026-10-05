import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// ضع البيانات التي نسختها من لوحة Firebase هنا
const firebaseConfig = {
  apiKey: "ضع_مفتاح_الـ_API_الخاص_بمشروعك_هنا",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
