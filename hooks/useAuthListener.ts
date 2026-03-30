/**
 * VoltCheck — Auth State Listener Hook
 * Syncs Firebase Auth state with Zustand store
 * Handles auto-redirect: login ↔ tabs
 */

import { getFirebaseServices } from '@/services/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** Create or update user document in Firestore on first/each login */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureUserDoc(db: any, user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }) {
  if (Platform.OS === 'web') {
    const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        notificationsEnabled: true,
      });
    } else {
      // Update last login + latest profile info
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLoginAt: serverTimestamp(),
      }, { merge: true });
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRef = (db as any).collection('users').doc(user.uid);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = await userRef.get() as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firestore = (await import('@react-native-firebase/firestore')).default as any;
    if (!snap.exists) {
      await userRef.set({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: firestore.FieldValue.serverTimestamp(),
        notificationsEnabled: true,
      });
    } else {
      await userRef.set({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLoginAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
}

export function useAuthListener() {
  const [isReady, setIsReady] = useState(false);
  const { setUser, setLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const { user, isAuthenticated } = useAuthStore();

  // ── 1. Listen to Firebase Auth state changes ───────────────────────────
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const { auth, db } = await getFirebaseServices();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleUser = async (firebaseUser: any) => {
          if (firebaseUser) {
            const userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            };
            setUser(userData);

            // Ensure Firestore user doc exists (first login creates it)
            try {
              await ensureUserDoc(db, userData);
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn('[AuthListener] Failed to ensure user doc:', e);
            }
          } else {
            setUser(null);
          }
          setIsReady(true);
        };

        if (Platform.OS === 'web') {
          const { onAuthStateChanged } = await import('firebase/auth');
          unsubscribe = onAuthStateChanged(auth, handleUser);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unsubscribe = (auth as any).onAuthStateChanged(handleUser);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[AuthListener] Firebase init failed:', err);
        setLoading(false);
        setIsReady(true);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Route guard — redirect based on auth state ──────────────────────
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // Logged in but on auth screen → go to tabs (home)
      router.replace('/');
    } else if (!isAuthenticated && !inAuthGroup) {
      // Not logged in but on protected screen → go to login
      router.replace('/login');
    }
  }, [isAuthenticated, segments, isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isReady, user };
}
