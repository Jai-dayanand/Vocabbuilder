import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDw2TWTi3JtMZsiPhl1IPa8aGzMj49mUos",
  authDomain: "gre-vocab-app-3a201.firebaseapp.com",
  projectId: "gre-vocab-app-3a201",
  storageBucket: "gre-vocab-app-3a201.firebasestorage.app",
  messagingSenderId: "382413382414",
  appId: "1:382413382414:web:da13d6e34f9c259e9c2d5f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;