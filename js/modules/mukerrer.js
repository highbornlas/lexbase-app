// ================================================================
// LEXBASE — MÜKERRER KAYIT TESPİT SİSTEMİ
// js/modules/mukerrer.js
//
// Aynı kişi, dosya veya belgenin birden fazla kez sisteme
// eklenmesini engeller. Her koleksiyon için özel eşleşme
// kriterleri tanımlanmıştır.
//
// Kontrol noktaları:
// 1. Müvekkil ekleme → mevcut müvekkillerle
// 2. Karşı taraf ekleme → mevcut karşı taraflarla
// 3. Dava ekleme → mevcut davalarla (esas no, mahkeme)
// 4. İcra ekleme → mevcut icra dosyalarıyla (esas no, daire)
// 5. İhtarname ekleme → mevcut ihtarnamelerle
// 6. Belge/evrak ekleme → aynı dosya adı/boyut
// ================================================================

const MukerrerKontrol = (function () {

  // ── Metin Normalizasyonu (menfaat modülüyle ortak) ─────────
  function normalize(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/\s+/g, ' ').trim()
      .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o')
      .replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's')
      .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g')
      .replace(/[.,'"\-()]/g, '');
  }

  function telNormalize(tel) {
    if (!tel) return '';
    return tel.replace(/[\s\-()+ ]/g, '').replace(/^0/, '').replace(/^90/, '');
  }

  // ── Kişi Mükerrer Kontrolü (Müvekkil & Karşı Taraf) ───────
  function kisiKontrol(yeniKisi, mevcutListe, haricId) {
    const eslesmeler = [];

    mevcutListe.forEach(mevcut => {
      // Kendisiyle karşılaştırma (düzenleme modunda)
      if (haricId && mevcut.id === haricId) return;

      const benzerlikler = [];
      let skor = 0;

      // TC Kimlik No — kesin
      if (yeniKisi.tc && mevcut.tc && yeniKisi.tc === mevcut.tc) {
        benzerlikler.push({ alan: 'TC Kimlik No', deger: yeniKisi.tc, kesin: true });
        skor = 100;
      }

      // Vergi No — kesin
      if (yeniKisi.vergiNo && mevcut.vergiNo && yeniKisi.vergiNo === mevcut.vergiNo) {
        benzerlikler.push({ alan: 'Vergi No', deger: yeniKisi.vergiNo, kesin: true });
        skor = 100;
      }

      // MERSİS — kesin
      if (yeniKisi.mersis && mevcut.mersis && yeniKisi.mersis === mevcut.mersis) {
        benzerlikler.push({ alan: 'MERSİS No', deger: yeniKisi.mersis, kesin: true });
        skor = 100;
      }

      // Telefon
      const tel1 = telNormalize(yeniKisi.tel);
      const tel2 = telNormalize(mevcut.tel);
      if (tel1 && tel2 && tel1.length >= 10 && tel1 === tel2) {
        benzerlikler.push({ alan: 'Telefon', deger: yeniKisi.tel, kesin: true });
        skor = Math.max(skor, 85);
      }

      // E-posta
      if (yeniKisi.mail && mevcut.mail && yeniKisi.mail.toLowerCase() === mevcut.mail.toLowerCase()) {
        benzerlikler.push({ alan: 'E-posta', deger: yeniKisi.mail, kesin: true });
        skor = Math.max(skor, 85);
      }

      // Ad benzerliği
      const ad1 = normalize(yeniKisi.ad);
      const ad2 = normalize(mevcut.ad);
      if (ad1 && ad2 && ad1 === ad2) {
        benzerlikler.push({ alan: 'Ad/Unvan', deger: yeniKisi.ad, kesin: true });
        skor = Math.max(skor, 90);
      } else if (ad1 && ad2) {
        // Kelime bazlı benzerlik
        const k1 = ad1.split(' ').filter(Boolean);
        const k2 = ad2.split(' ').filter(Boolean);
        const ortak = k1.filter(w => k2.includes(w)).length;
        const oran = ortak / Math.max(k1.length, k2.length);
        if (oran >= 0.7) {
          benzerlikler.push({ alan: 'Ad/Unvan (benzer)', deger: `"${yeniKisi.ad}" ↔ "${mevcut.ad}"`, kesin: false });
          skor = Math.max(skor, Math.round(oran * 80));
        }
      }

      if (benzerlikler.length > 0 && skor >= 50) {
        eslesmeler.push({
          id: mevcut.id,
          ad: mevcut.ad,
          skor,
          kesin: skor >= 85,
          benzerlikler,
          mevcut, // tüm veri (detay göstermek için)
        });
      }
    });

    eslesmeler.sort((a, b) => b.skor - a.skor);
    return eslesmeler;
  }

  // ── Dava Mükerrer Kontrolü ─────────────────────────────────
  function davaKontrol(yeniDava, haricId) {
    const eslesmeler = [];

    (state.davalar || []).forEach(d => {
      if (haricId && d.id === haricId) return;
      const benzerlikler = [];
      let skor = 0;

      // Esas No (yıl/no) — en güçlü eşleşme
      if (yeniDava.esasYil && yeniDava.esasNo && d.esasYil && d.esasNo) {
        if (yeniDava.esasYil === d.esasYil && yeniDava.esasNo === d.esasNo) {
          // Aynı mahkemede aynı esas no → kesin mükerrer
          if (yeniDava.adliye && d.adliye && yeniDava.adliye === d.adliye &&
              yeniDava.mtur && d.mtur && yeniDava.mtur === d.mtur) {
            benzerlikler.push({ alan: 'Esas No + Mahkeme', deger: `${d.esasYil}/${d.esasNo} — ${d.adliye} ${d.mtur}`, kesin: true });
            skor = 100;
          } else {
            benzerlikler.push({ alan: 'Esas No', deger: `${d.esasYil}/${d.esasNo}`, kesin: false });
            skor = Math.max(skor, 70);
          }
        }
      }

      // Aynı müvekkil + aynı konu + aynı karşı taraf
      if (yeniDava.muvId && d.muvId && yeniDava.muvId === d.muvId) {
        const konu1 = normalize(yeniDava.konu);
        const konu2 = normalize(d.konu);
        if (konu1 && konu2 && konu1 === konu2) {
          benzerlikler.push({ alan: 'Müvekkil + Konu', deger: `${getMuvAd(d.muvId)} — ${d.konu}`, kesin: false });
          skor = Math.max(skor, 75);
        }
      }

      // Dosya no aynıysa
      if (yeniDava.no && d.no && yeniDava.no === d.no) {
        benzerlikler.push({ alan: 'Dosya No', deger: d.no, kesin: true });
        skor = Math.max(skor, 90);
      }

      if (benzerlikler.length > 0 && skor >= 50) {
        eslesmeler.push({
          id: d.id, ad: `${d.no} — ${d.konu}`,
          detay: `${getMuvAd(d.muvId)} · ${d.adliye || ''} ${d.mtur || ''} · ${d.durum}`,
          skor, kesin: skor >= 85, benzerlikler, mevcut: d,
        });
      }
    });

    eslesmeler.sort((a, b) => b.skor - a.skor);
    return eslesmeler;
  }

  // ── İcra Mükerrer Kontrolü ─────────────────────────────────
  function icraKontrol(yeniIcra, haricId) {
    const eslesmeler = [];

    (state.icra || []).forEach(i => {
      if (haricId && i.id === haricId) return;
      const benzerlikler = [];
      let skor = 0;

      // Esas no + daire — kesin
      if (yeniIcra.esas && i.esas && yeniIcra.esas === i.esas) {
        if (yeniIcra.daire && i.daire && normalize(yeniIcra.daire) === normalize(i.daire)) {
          benzerlikler.push({ alan: 'Esas No + İcra Dairesi', deger: `${i.esas} — ${i.daire}`, kesin: true });
          skor = 100;
        } else {
          benzerlikler.push({ alan: 'Esas No', deger: i.esas, kesin: false });
          skor = Math.max(skor, 70);
        }
      }

      // Aynı müvekkil + aynı borçlu
      if (yeniIcra.muvId && i.muvId && yeniIcra.muvId === i.muvId) {
        const b1 = normalize(yeniIcra.borclu);
        const b2 = normalize(i.borclu);
        if (b1 && b2 && b1 === b2) {
          benzerlikler.push({ alan: 'Müvekkil + Borçlu', deger: `${getMuvAd(i.muvId)} → ${i.borclu}`, kesin: false });
          skor = Math.max(skor, 75);
        }
      }

      // Dosya no
      if (yeniIcra.no && i.no && yeniIcra.no === i.no) {
        benzerlikler.push({ alan: 'Dosya No', deger: i.no, kesin: true });
        skor = Math.max(skor, 90);
      }

      if (benzerlikler.length > 0 && skor >= 50) {
        eslesmeler.push({
          id: i.id, ad: `${i.no} — ${i.borclu}`,
          detay: `${getMuvAd(i.muvId)} · ${i.adliye || ''} ${i.daire || ''} · ${i.durum}`,
          skor, kesin: skor >= 85, benzerlikler, mevcut: i,
        });
      }
    });

    eslesmeler.sort((a, b) => b.skor - a.skor);
    return eslesmeler;
  }

  // ── Evrak/Belge Mükerrer Kontrolü ──────────────────────────
  function evrakKontrol(dosyaAdi, dosyaBoyut, mevcutEvraklar) {
    const eslesmeler = [];
    const ad1 = normalize(dosyaAdi);

    (mevcutEvraklar || []).forEach(e => {
      const ad2 = normalize(e.ad || e.dosyaAd || '');
      if (ad1 && ad2 && ad1 === ad2) {
        eslesmeler.push({
          id: e.id, ad: e.ad || e.dosyaAd,
          detay: `${fmtD(e.tarih)} · ${fileSize(e.data)}`,
          skor: 95, kesin: true,
          benzerlikler: [{ alan: 'Dosya Adı', deger: dosyaAdi, kesin: true }],
        });
      }
    });

    return eslesmeler;
  }

  // ── Uyarı Modalı ──────────────────────────────────────────
  function uyariGoster(tur, yeniAd, eslesmeler, devamFn) {
    const turLabel = {
      muvekkil: 'Müvekkil', karsiTaraf: 'Karşı Taraf',
      dava: 'Dava', icra: 'İcra Dosyası', evrak: 'Belge/Evrak'
    };
    const kesinVar = eslesmeler.some(e => e.kesin);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'mukerrer-uyari-modal';
    modal.style.cssText = 'z-index:99999';
    modal.innerHTML = `
      <div class="modal" style="max-width:560px;animation:modalIn .2s ease">
        <div class="modal-header" style="border-bottom-color:#e67e22">
          <div class="modal-title" style="color:#e67e22">
            📋 Olası Mükerrer ${escHTML(turLabel[tur] || 'Kayıt')} Tespit Edildi
          </div>
        </div>
        <div class="modal-body" style="padding:16px 20px">
          <div style="background:rgba(230,126,34,.1);border:1px solid #e67e22;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:12px;line-height:1.6;color:#e67e22">
            <strong>"${escHTML(yeniAd)}"</strong> adlı kayıt, sistemdeki mevcut kayıtlarla benzerlik gösteriyor. Mükerrer kayıt oluşturmamak için lütfen kontrol edin.
          </div>

          ${eslesmeler.map(e => `
            <div style="background:var(--surface2);border:1px solid var(--border);border-left:4px solid ${e.kesin ? '#e67e22' : 'var(--border)'};border-radius:var(--radius);padding:12px 14px;margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:700;color:var(--text)">${escHTML(e.ad)}</div>
                  ${e.detay ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${escHTML(e.detay)}</div>` : ''}
                </div>
                <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px;background:rgba(230,126,34,.15);color:#e67e22;flex-shrink:0;margin-left:8px">
                  %${e.skor} ${e.kesin ? 'eşleşme' : 'benzerlik'}
                </span>
              </div>
              <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">
                ${e.benzerlikler.map(b => `
                  <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(230,126,34,.08);color:#e67e22;border:1px solid rgba(230,126,34,.2)">
                    ${escHTML(b.alan)}: ${escHTML(b.deger)}
                  </span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-outline" onclick="document.getElementById('mukerrer-uyari-modal').remove()">
            ← İptal, Mevcut Kaydı Kullan
          </button>
          <button class="btn btn-gold" onclick="document.getElementById('mukerrer-uyari-modal').remove(); if(typeof _mukerrerDevamFn==='function') _mukerrerDevamFn();">
            Yine de Yeni Kayıt Oluştur
          </button>
        </div>
      </div>`;

    window._mukerrerDevamFn = devamFn || null;
    document.body.appendChild(modal);
  }

  // ── Public API ──────────────────────────────────────────────
  return {
    kisiKontrol,
    davaKontrol,
    icraKontrol,
    evrakKontrol,
    uyariGoster,
  };

})();
