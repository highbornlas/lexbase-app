'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/* ══════════════════════════════════════════════════════════════
   Premium Modal — Double-click close + Onay Dialogu + Draft
   ══════════════════════════════════════════════════════════════ */

const DOUBLE_CLICK_MS = 400; // İki tıklama arası max süre

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Form değişmiş mi? true ise kapatmada onay dialogu gösterilir */
  dirty?: boolean;
  /** Draft banner göster — "Taslak bulundu" */
  hasDraft?: boolean;
  /** Draft yükle butonu tıklandığında */
  onLoadDraft?: () => void;
  /** Draft sil butonu tıklandığında */
  onDiscardDraft?: () => void;
  /** Onay dialogunda "Taslak olarak kaydet" seçildiğinde (ek işlem) */
  onSaveDraft?: () => void;
}

export function Modal({
  open, onClose, title, maxWidth = 'max-w-lg',
  children, footer,
  dirty = false, hasDraft = false,
  onLoadDraft, onDiscardDraft, onSaveDraft,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastClickRef = useRef<number>(0);
  const [onayGoster, setOnayGoster] = useState(false);

  // Reset onay dialog when modal opens/closes
  useEffect(() => {
    if (!open) setOnayGoster(false);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ── Kapatma girişimi — dirty ise onay, değilse direkt kapat ──
  const attemptClose = useCallback(() => {
    if (dirty) {
      setOnayGoster(true);
    } else {
      onClose();
    }
  }, [dirty, onClose]);

  // ── Escape tuşu ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (onayGoster) {
          setOnayGoster(false); // Onay dialogunu kapat
        } else {
          attemptClose();
        }
      }
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, attemptClose, onayGoster]);

  // ── Backdrop double-click detection ──
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target !== overlayRef.current) return;
    if (onayGoster) return; // Onay gösteriliyorsa backdrop tıklamasını yoksay

    const now = Date.now();
    if (now - lastClickRef.current < DOUBLE_CLICK_MS) {
      // Double click → kapatmayı dene
      lastClickRef.current = 0;
      attemptClose();
    } else {
      lastClickRef.current = now;
    }
  }

  // ── Onay: Taslak Kaydet ──
  function handleTaslakKaydet() {
    onSaveDraft?.();
    setOnayGoster(false);
    onClose();
  }

  // ── Onay: Değişiklikleri Sil ──
  function handleDegisiklikSil() {
    onDiscardDraft?.();
    setOnayGoster(false);
    onClose();
  }

  const titleId = 'modal-title';

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center animate-fade-in-up"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal-box w-[95%] ${maxWidth} animate-scale-in`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <h2 id={titleId} className="text-base font-semibold text-text">{title}</h2>
            {dirty && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                düzenlendi
              </span>
            )}
          </div>
          <button
            onClick={attemptClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       hover:bg-surface2 text-text-muted hover:text-text transition-all duration-200"
          >
            ✕
          </button>
        </div>

        {/* Draft Banner */}
        {hasDraft && !onayGoster && (
          <div className="mx-6 mt-3 flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2.5">
            <span className="text-blue-400 text-sm">📝</span>
            <span className="text-xs text-blue-300 flex-1">Kaydedilmemiş taslak bulundu</span>
            <button
              onClick={onLoadDraft}
              className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-blue-500/10"
            >
              Geri Yükle
            </button>
            <button
              onClick={onDiscardDraft}
              className="text-[11px] font-medium text-text-dim hover:text-red transition-colors px-2 py-1 rounded hover:bg-red/10"
            >
              Sil
            </button>
          </div>
        )}

        {/* Onay Dialogu */}
        {onayGoster && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[20px]">
            <div className="bg-surface border border-border rounded-xl shadow-2xl p-6 max-w-sm mx-4 animate-scale-in">
              <div className="text-center mb-5">
                <div className="text-3xl mb-2">⚠️</div>
                <h3 className="text-sm font-semibold text-text mb-1">Kaydedilmemiş değişiklikler var</h3>
                <p className="text-xs text-text-muted">
                  Bu formdaki değişiklikleriniz henüz kaydedilmedi. Ne yapmak istersiniz?
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleTaslakKaydet}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold
                             bg-gold/10 border border-gold/30 text-gold
                             hover:bg-gold/20 transition-all"
                >
                  📝 Taslak olarak kaydet
                </button>
                <button
                  onClick={handleDegisiklikSil}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold
                             bg-red/10 border border-red/30 text-red
                             hover:bg-red/20 transition-all"
                >
                  🗑️ Değişiklikleri sil
                </button>
                <button
                  onClick={() => setOnayGoster(false)}
                  className="w-full py-2 rounded-lg text-xs text-text-muted
                             hover:bg-surface2 transition-all"
                >
                  Düzenlemeye devam et
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Form Components — Premium Styled
   ══════════════════════════════════════════════════════════════ */

export function FormGroup({ label, required, error, children }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">
        {label} {required && <span className="text-red">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red mt-1">{error}</p>}
    </div>
  );
}

export function FormInput({ type = 'text', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      {...props}
      className={`form-input ${props.className || ''}`}
    />
  );
}

export function FormSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`form-input ${props.className || ''}`}
    >
      {children}
    </select>
  );
}

export function FormTextarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`form-input resize-none ${props.className || ''}`}
    />
  );
}


/* ══════════════════════════════════════════════════════════════
   Button Components — Gradient + Shadow + Hover Lift
   Orijinal: .btn-gold, .btn-outline
   ══════════════════════════════════════════════════════════════ */

export function BtnGold({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn-gold ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

export function BtnOutline({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn-outline ${props.className || ''}`}
    >
      {children}
    </button>
  );
}
