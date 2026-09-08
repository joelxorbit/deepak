/**
 * Firebase Client SDK Configuration
 * ─────────────────────────────────
 * Set VITE_FIREBASE_* variables in your Vercel project settings.
 * Get these values from: Firebase Console → Project Settings → Your apps → Web app → SDK setup
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDWt3_QiLG5L429S-Ob5h9X4cNSTlNflhs",
  authDomain: "deepak-f0ba9.firebaseapp.com",
  projectId: "deepak-f0ba9",
  storageBucket: "deepak-f0ba9.firebasestorage.app",
  messagingSenderId: "881348615948",
  appId: "1:881348615948:web:75f46a797e4e8b2b6cf329"
};

// Prevent duplicate initialization (Vite HMR re-runs modules)
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Request profile + email scopes
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Force account selection even when user is already signed in to Google
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Signs the user in with Google popup and returns the Firebase ID token.
 * The ID token is verified server-side using admin.auth().verifyIdToken().
 *
 * @returns {{ idToken: string, user: firebase.User }}
 */
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return {
    idToken,
    user: {
      uid:         result.user.uid,
      email:       result.user.email,
      displayName: result.user.displayName,
      photoURL:    result.user.photoURL,
    },
  };
};

/**
 * Signs the currently authenticated Firebase user out.
 */
export const signOutFirebase = async () => {
  await signOut(auth);
};

export default firebaseApp;
