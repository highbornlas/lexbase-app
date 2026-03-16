'use client';

import { useInactivityLogout } from '@/lib/hooks/useInactivityLogout';

/**
 * InactivityWarning — 15 dk hareketsizlikte otomatik oturum kapatma.
 * 13. dakikada uyarı modalı gösterir, 15. dakikada çıkış yapar.
 */
export function InactivityWarning() {
  const { showWarning, handleContinue } = useInactivityLogout();

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in-up">
      <div className="w-[90%] max-w-md bg-[#131A2B] border border-white/10 rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.85),0_0_60px_rgba(201,168,76,0.04)] animate-scale-in p-6 text-center">
        {/* Icon */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-text mb-2">
          Oturum Zaman Asimi
        </h3>

        {/* Message */}
        <p className="text-sm text-text-dim mb-6 leading-relaxed">
          Oturumunuz 2 dakika icinde sonlanacak.
          <br />
          Devam etmek istiyor musunuz?
        </p>

        {/* Button */}
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 bg-gold hover:bg-gold-hover text-black font-semibold text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gold/40"
        >
          Devam Et
        </button>
      </div>
    </div>
  );
}
