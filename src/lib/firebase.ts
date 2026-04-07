// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD5pLkUtEyKTjhYccAZTGvJKMRxDujYcGc",
  authDomain: "american-loan-hub.firebaseapp.com",
  projectId: "american-loan-hub",
  storageBucket: "american-loan-hub.firebasestorage.app",
  messagingSenderId: "1055574767964",
  appId: "1:1055574767964:web:f94430e89db8d19be9e999",
  measurementId: "G-7SDXCXCLYQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };