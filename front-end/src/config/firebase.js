import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDWt3_QiLG5L429S-Ob5h9X4cNSTlNflhs",
  authDomain: "deepak-f0ba9.firebaseapp.com",
  projectId: "deepak-f0ba9",
  storageBucket: "deepak-f0ba9.firebasestorage.app",
  messagingSenderId: "881348615948",
  appId: "1:881348615948:web:75f46a797e4e8b2b6cf329"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGooglePopup = () => signInWithPopup(auth, googleProvider);
