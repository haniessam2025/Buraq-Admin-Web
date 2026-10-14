import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // 👈 أضفنا هذا السطر

const firebaseConfig = {
  apiKey: "AIzaSyDq5trvT-Hfw1y7nwIlqe3a2A0uf9AeVOs",
  authDomain: "badr-cute.firebaseapp.com",
  projectId: "badr-cute",
  storageBucket: "badr-cute.firebasestorage.app",
  messagingSenderId: "520549143229",
  appId: "1:520549143229:web:dec6116c6f0665483f1dd4",
  measurementId: "G-Q0YR2GSB2Q"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // 👈 أضفنا هذا السطر لتصدير خدمة المصادقة