'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const INACTIVITY_TIMEOUT = 900_000;   // 15 dakika
const WARNING_BEFORE    = 120_000;    // 2 dakika önce uyarı
const WARNING_AT        = INACTIVITY_TIMEOUT - WARNING_BEFORE; // 13 dk sonra uyarı

const TRACKED_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
];

export function useInactivityLogout() {
  const [showWarning, setShowWarning] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const performLogout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/giris');
  }, [clearTimers, router]);

  const resetTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    // 13 dk sonra uyarı göster
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, WARNING_AT);

    // 15 dk sonra çıkış yap
    logoutTimerRef.current = setTimeout(() => {
      performLogout();
    }, INACTIVITY_TIMEOUT);
  }, [clearTimers, performLogout]);

  const handleContinue = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    resetTimers();

    const onActivity = () => {
      // Uyarı modal açıkken aktiviteyi yoksay — sadece butona basmalı
      if (!showWarning) {
        resetTimers();
      }
    };

    for (const event of TRACKED_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of TRACKED_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
    // showWarning değiştiğinde listener'ı güncelle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning]);

  return { showWarning, handleContinue };
}
