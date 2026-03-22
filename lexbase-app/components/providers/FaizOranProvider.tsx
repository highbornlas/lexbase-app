'use client';

import { useEffect } from 'react';
import { useFaizOranDB } from '@/lib/hooks/useFaizOranlari';
import { setSupabaseFaizOranlari } from '@/lib/utils/faiz';

/**
 * Supabase'den faiz oranlarını çekip faiz.ts hesaplama motoruna senkronize eder.
 * Layout'a eklenmelidir — tüm sayfalarda aktif kalır.
 */
export function FaizOranProvider({ children }: { children: React.ReactNode }) {
  const oranDB = useFaizOranDB();

  useEffect(() => {
    if (oranDB) {
      setSupabaseFaizOranlari(oranDB);
    }
  }, [oranDB]);

  return <>{children}</>;
}
