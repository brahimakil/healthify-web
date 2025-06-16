import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD3wulF0Lgl7jK6d2b7fbvItsYpu4F0c3k",
  authDomain: "healthify-26f7e.firebaseapp.com",
  projectId: "healthify-26f7e",
  storageBucket: "healthify-26f7e.firebasestorage.app",
  messagingSenderId: "329529586028",
  appId: "1:329529586028:web:07aacef0272eeac8c6c349",
  measurementId: "G-NDLDT0BB7L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
