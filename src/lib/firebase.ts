// ============================================
// Firebase Initialisierung
// ============================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  linkWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'firebase/auth';
import type { User } from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

const firebaseConfig = {
  apiKey: 'AIzaSyDz017uN5p0zEX4szcHqzveYs_NhNTGLhE',
  authDomain: 'hollandturnier.firebaseapp.com',
  projectId: 'hollandturnier',
  storageBucket: 'hollandturnier.firebasestorage.app',
  messagingSenderId: '160165101537',
  appId: '1:160165101537:web:1caaa3028b18a1032f9ca0',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Einmaliges Promise – wird beim ersten Aufruf gestartet und gecacht
let userPromise: Promise<User> | null = null;

/**
 * Gibt den aktuell angemeldeten User zurück (anonym, auto sign-in).
 * Kann in beliebig vielen parallelen Aufrufen verwendet werden.
 */
export function ensureSignedIn(): Promise<User> {
  if (!userPromise) {
    userPromise = new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          try {
            const cred = await signInAnonymously(auth);
            resolve(cred.user);
          } catch (e) {
            userPromise = null;
            reject(e);
          }
        }
      });
    });
  }
  return userPromise;
}

/**
 * Mit Google anmelden.
 * Wenn der User noch anonym ist, wird der anonyme Account mit Google verknüpft
 * (Daten bleiben erhalten). Auf einem anderen Gerät kann derselbe Google-Account
 * dann über normales signInWithPopup verwendet werden.
 */
export async function signInWithGoogle(): Promise<User> {
  const currentUser = auth.currentUser;
  if (currentUser?.isAnonymous) {
    try {
      const result = await linkWithPopup(currentUser, googleProvider);
      userPromise = Promise.resolve(result.user);
      return result.user;
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/credential-already-in-use') {
        // Google-Account existiert bereits → normal anmelden
        const result = await signInWithPopup(auth, googleProvider);
        userPromise = Promise.resolve(result.user);
        return result.user;
      }
      throw error;
    }
  }
  const result = await signInWithPopup(auth, googleProvider);
  userPromise = Promise.resolve(result.user);
  return result.user;
}

/** Abmelden */
export async function signOutUser(): Promise<void> {
  userPromise = null;
  await firebaseSignOut(auth);
}

/** Auth-State beobachten — gibt Unsubscribe-Funktion zurück */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
