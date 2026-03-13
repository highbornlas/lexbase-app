'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Giriş yapmış kullanıcının buro_id'sini döndürür.
 * Supabase Auth user_metadata.buro_id veya burolar tablosundan.
 */
export function useBuroId(): string | null {
  const [buroId, setBuroId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.user_metadata?.buro_id
        || data.user?.app_metadata?.buro_id
        || null;
      setBuroId(id);
    });
  }, []);

  return buroId;
}
