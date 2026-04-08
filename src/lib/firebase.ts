import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyD5pLkUtEyKTjhYccAZTGvJKMRxDujYcGc",
  authDomain: "american-loan-hub.firebaseapp.com",
  projectId: "american-loan-hub",
  storageBucket: "american-loan-hub.firebasestorage.app",
  messagingSenderId: "1055574767964",
  appId: "1:1055574767964:web:f94430e89db8d19be9e999",
  measurementId: "G-7SDXCXCLYQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;