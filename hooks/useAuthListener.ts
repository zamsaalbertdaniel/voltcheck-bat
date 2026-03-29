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
        const { auth } = await getFirebaseServices();

        if (Platform.OS === 'web') {
          const { onAuthStateChanged } = await import('firebase/auth');
          unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              });
            } else {
              setUser(null);
            }
            setIsReady(true);
          });
        } else {
          // Native: @react-native-firebase/auth returns an unsubscribe directly
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unsubscribe = (auth as any).onAuthStateChanged((firebaseUser: any) => {
            if (firebaseUser) {
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              });
            } else {
              setUser(null);
            }
            setIsReady(true);
          });
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
