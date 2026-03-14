'use client';

import { useMemo } from 'react';
import { useDavalar } from './useDavalar';
import { useIcralar } from './useIcra';

/* ══════════════════════════════════════════════════════════════
   Mahkeme / İcra Dairesi Hafızası
   Daha önce girilen mahkeme ve daire bilgilerini hatırlar
   ══════════════════════════════════════════════════════════════ */

export interface MahkemeOnerisi {
  il: string;
  adliye: string;
  mtur: string;
  mno: string;
  tamAd: string;
}

export interface DaireOnerisi {
  il: string;
  adliye: string;
  daire: string;
  tamAd: string;
}

export function useMahkemeHafizasi() {
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();

  // Benzersiz mahkeme kombinasyonları
  const mahkemeler = useMemo<MahkemeOnerisi[]>(() => {
    if (!davalar) return [];
    const set = new Map<string, MahkemeOnerisi>();

    davalar.forEach((d) => {
      if (d.il && d.mtur) {
        const key = `${d.il}-${d.adliye || ''}-${d.mtur}-${d.mno || ''}`;
        if (!set.has(key)) {
          const parcalar = [d.il, d.mno ? `${d.mno}.` : '', d.mtur, 'Mahkemesi'].filter(Boolean);
          set.set(key, {
            il: d.il,
            adliye: d.adliye || '',
            mtur: d.mtur,
            mno: d.mno || '',
            tamAd: parcalar.join(' '),
          });
        }
      }
    });

    return Array.from(set.values());
  }, [davalar]);

  // Benzersiz adliye isimleri
  const adliyeler = useMemo<string[]>(() => {
    const set = new Set<string>();
    davalar?.forEach((d) => { if (d.adliye) set.add(d.adliye); });
    icralar?.forEach((i) => { if (i.adliye) set.add(i.adliye); });
    return Array.from(set).sort();
  }, [davalar, icralar]);

  // Benzersiz icra dairesi kombinasyonları
  const daireler = useMemo<DaireOnerisi[]>(() => {
    if (!icralar) return [];
    const set = new Map<string, DaireOnerisi>();

    icralar.forEach((i) => {
      if (i.il && i.daire) {
        const key = `${i.il}-${i.adliye || ''}-${i.daire}`;
        if (!set.has(key)) {
          const parcalar = [i.il, i.daire];
          if (!i.daire.toLowerCase().includes('müdürlüğü')) parcalar.push('İcra Müdürlüğü');
          set.set(key, {
            il: i.il,
            adliye: i.adliye || '',
            daire: i.daire,
            tamAd: parcalar.join(' '),
          });
        }
      }
    });

    return Array.from(set.values());
  }, [icralar]);

  // Benzersiz iller (daha önce kullanılan)
  const kullanılanIller = useMemo<string[]>(() => {
    const set = new Set<string>();
    davalar?.forEach((d) => { if (d.il) set.add(d.il); });
    icralar?.forEach((i) => { if (i.il) set.add(i.il); });
    return Array.from(set).sort();
  }, [davalar, icralar]);

  return { mahkemeler, daireler, adliyeler, kullanılanIller };
}
