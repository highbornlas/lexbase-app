// ================================================================
// LEXBASE — MENFAAT ÇAKIŞMASI TESPİT SİSTEMİ
// js/modules/menfaat.js
//
// Hukuk bürolarında aynı kişi/kuruluşun hem müvekkil hem karşı
// taraf olarak temsil edilmesini engeller. Avukatlık Kanunu m.38
// ve TBB Meslek Kuralları m.36 gereği zorunludur.
//
// Kontrol noktaları:
// 1. Müvekkil ekleme/düzenleme → karşı taraflarla çarpraz kontrol
// 2. Karşı taraf ekleme → müvekkillerle çarpraz kontrol
// 3. Dava ekleme → karşı taraf müvekkil mi?
// 4. İcra ekleme → borçlu/alacaklı müvekkil mi?
// 5. Arabuluculuk → karşı taraf müvekkil mi?
//
// Eşleşme kriterleri (öncelik sırasıyla):
// - TC Kimlik No (kesin eşleşme)
// - Vergi No (kesin eşleşme)
// - MERSİS No (kesin eşleşme)
// - Telefon numarası (kesin eşleşme)
// - E-posta adresi (kesin eşleşme)
// - Ad/Unvan benzerliği (bulanık eşleşme)
// ================================================================

const MenfaatKontrol = (function () {

  // ── Eşleşme ağırlıkları ─────────────────────────────────────
  const ESLESME = {
    tc:       { agirlik: 100, label: 'TC Kimlik No',  kesin: true },
    vergiNo:  { agirlik: 100, label: 'Vergi No',      kesin: true },
    mersis:   { agirlik: 100, label: 'MERSİS No',     kesin: true },
    tel:      { agirlik: 80,  label: 'Telefon',        kesin: true },
    mail:     { agirlik: 80,  label: 'E-posta',        kesin: true },
    ad:       { agirlik: 60,  label: 'Ad/Unvan',       kesin: false },
  };

  // Minimum eşleşme skoru (0-100) — bu skorun üstü çakışma sayılır
  const ESIK_KESIN = 80;   // Kesin çakışma (engelle)
  const ESIK_UYARI = 50;   // Olası çakışma (uyar)

  // ── Metin Normalizasyonu ────────────────────────────────────
  function normalize(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/\s+/g, ' ').trim()
      .replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[üÜ]/g, 'u')
      .replace(/[şŞ]/g, 's')
      .replace(/[çÇ]/g, 'c')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[.,'"\-()]/g, '');
  }

  function telNormalize(tel) {
    if (!tel) return '';
    return tel.replace(/[\s\-()+ ]/g, '').replace(/^0/, '').replace(/^90/, '');
  }

  // ── Bulanık Ad Eşleşmesi ───────────────────────────────────
  function adBenzerlik(ad1, ad2) {
    const a = normalize(ad1);
    const b = normalize(ad2);
    if (!a || !b) return 0;
    if (a === b) return 100;

    // Kelime bazlı karşılaştırma
    const kelimelerA = a.split(' ').filter(Boolean);
    const kelimelerB = b.split(' ').filter(Boolean);

    // Her kelime diğer sette var mı?
    let eslesen = 0;
    const toplamKelime = Math.max(kelimelerA.length, kelimelerB.length);

    kelimelerA.forEach(ka => {
      if (kelimelerB.some(kb => kb === ka || kb.includes(ka) || ka.includes(kb))) eslesen++;
    });

    const oran = eslesen / toplamKelime;

    // İlk ve son kelimeler (ad + soyad) eşleşiyorsa yüksek skor
    if (kelimelerA.length >= 2 && kelimelerB.length >= 2) {
      const adEsles = kelimelerA[0] === kelimelerB[0];
      const soyadEsles = kelimelerA[kelimelerA.length - 1] === kelimelerB[kelimelerB.length - 1];
      if (adEsles && soyadEsles) return 90;
      if (soyadEsles && oran > 0.5) return 75;
    }

    // Kapsama oranı
    if (oran >= 0.8) return 80;
    if (oran >= 0.6) return 60;
    if (oran >= 0.4) return 40;
    return oran * 50;
  }

  // ── İki kişi/kurum arasındaki çakışma skoru ────────────────
  function skorHesapla(kisi1, kisi2) {
    const eslesmeler = [];
    let toplamSkor = 0;

    // TC Kimlik No
    if (kisi1.tc && kisi2.tc && kisi1.tc === kisi2.tc) {
      eslesmeler.push({ alan: 'TC Kimlik No', deger: kisi1.tc, kesin: true });
      toplamSkor = 100;
    }

    // Vergi No
    if (kisi1.vergiNo && kisi2.vergiNo && kisi1.vergiNo === kisi2.vergiNo) {
      eslesmeler.push({ alan: 'Vergi No', deger: kisi1.vergiNo, kesin: true });
      toplamSkor = 100;
    }

    // MERSİS No
    if (kisi1.mersis && kisi2.mersis && kisi1.mersis === kisi2.mersis) {
      eslesmeler.push({ alan: 'MERSİS No', deger: kisi1.mersis, kesin: true });
      toplamSkor = 100;
    }

    // Telefon
    const tel1 = telNormalize(kisi1.tel);
    const tel2 = telNormalize(kisi2.tel);
    if (tel1 && tel2 && tel1.length >= 10 && tel1 === tel2) {
      eslesmeler.push({ alan: 'Telefon', deger: kisi1.tel, kesin: true });
      toplamSkor = Math.max(toplamSkor, 80);
    }

    // E-posta
    if (kisi1.mail && kisi2.mail && kisi1.mail.toLowerCase() === kisi2.mail.toLowerCase()) {
      eslesmeler.push({ alan: 'E-posta', deger: kisi1.mail, kesin: true });
      toplamSkor = Math.max(toplamSkor, 80);
    }

    // Ad/Unvan benzerliği
    const adSkor = adBenzerlik(kisi1.ad, kisi2.ad);
    if (adSkor >= 60) {
      eslesmeler.push({ alan: 'Ad/Unvan', deger: `"${kisi1.ad}" ↔ "${kisi2.ad}" (%${adSkor})`, kesin: false });
      toplamSkor = Math.max(toplamSkor, adSkor);
    }

    return { skor: toplamSkor, eslesmeler };
  }

  // ── Tüm veri kaynaklarından kişi listesi çıkar ─────────────
  function tumMuvekkiller() {
    return (state.muvekkillar || []).map(m => ({
      id: m.id, kaynak: 'muvekkil', ad: m.ad,
      tc: m.tc, vergiNo: m.vergiNo, mersis: m.mersis,
      tel: m.tel, mail: m.mail
    }));
  }

  function tumKarsiTaraflar() {
    const sonuc = [];

    // Kayıtlı karşı taraflar
    (state.karsiTaraflar || []).forEach(k => {
      sonuc.push({
        id: k.id, kaynak: 'karsiTaraf', ad: k.ad,
        tc: k.tc, vergiNo: k.vergiNo, mersis: k.mersis,
        tel: k.tel, mail: k.mail
      });
    });

    // Davalardaki karşı taraflar (isimle kayıtlı olanlar — karsiId olmadan)
    (state.davalar || []).forEach(d => {
      if (d.karsi && !d.karsiId) {
        sonuc.push({
          id: 'dava_' + d.id, kaynak: 'davaKarsi', ad: d.karsi,
          tc: '', vergiNo: '', mersis: '', tel: '', mail: '',
          davaNo: d.no, davaKonu: d.konu
        });
      }
    });

    // İcra borçluları
    (state.icra || []).forEach(i => {
      if (i.borclu) {
        sonuc.push({
          id: 'icra_' + i.id, kaynak: 'icraBorclu', ad: i.borclu,
          tc: i.btc || '', vergiNo: '', mersis: '', tel: '', mail: '',
          icraNo: i.no
        });
      }
    });

    // Arabuluculuk karşı tarafları
    (state.arabuluculuk || []).forEach(a => {
      if (a.karsi) {
        sonuc.push({
          id: 'arab_' + a.id, kaynak: 'arabKarsi', ad: a.karsi,
          tc: '', vergiNo: '', mersis: '', tel: '', mail: '',
          arabKonu: a.konu
        });
      }
    });

    return sonuc;
  }

  // ── Ana kontrol fonksiyonu ─────────────────────────────────
  // Bir kişiyi tüm karşı tarafa karşı kontrol et
  function kontrolEt(kisi, yon) {
    // yon: 'muvekkil' → karşı taraflarla karşılaştır
    //      'karsiTaraf' → müvekkillerle karşılaştır
    const hedefListe = yon === 'muvekkil' ? tumKarsiTaraflar() : tumMuvekkiller();
    const cakismalar = [];

    hedefListe.forEach(hedef => {
      const { skor, eslesmeler } = skorHesapla(kisi, hedef);
      if (skor >= ESIK_UYARI) {
        const kaynakLabel = {
          'muvekkil': 'Müvekkil', 'karsiTaraf': 'Karşı Taraf',
          'davaKarsi': 'Dava Karşı Tarafı', 'icraBorclu': 'İcra Borçlusu',
          'arabKarsi': 'Arabuluculuk Karşı Tarafı'
        };
        cakismalar.push({
          hedefId: hedef.id,
          hedefAd: hedef.ad,
          hedefKaynak: kaynakLabel[hedef.kaynak] || hedef.kaynak,
          skor,
          kesin: skor >= ESIK_KESIN,
          eslesmeler,
          // Dosya bilgileri
          davaNo: hedef.davaNo || '',
          davaKonu: hedef.davaKonu || '',
          icraNo: hedef.icraNo || '',
          arabKonu: hedef.arabKonu || '',
        });
      }
    });

    // Skora göre sırala (en yüksek önce)
    cakismalar.sort((a, b) => b.skor - a.skor);
    return cakismalar;
  }

  // ── Tüm sistemdeki çakışmaları tara ────────────────────────
  function tumSistemiTara() {
    const muvler = tumMuvekkiller();
    const karsilar = tumKarsiTaraflar();
    const cakismalar = [];
    const goruldu = new Set();

    muvler.forEach(muv => {
      karsilar.forEach(karsi => {
        const { skor, eslesmeler } = skorHesapla(muv, karsi);
        if (skor >= ESIK_UYARI) {
          const key = [muv.id, karsi.id].sort().join(':');
          if (goruldu.has(key)) return;
          goruldu.add(key);
          cakismalar.push({
            muvekkil: muv,
            karsiTaraf: karsi,
            skor,
            kesin: skor >= ESIK_KESIN,
            eslesmeler
          });
        }
      });
    });

    cakismalar.sort((a, b) => b.skor - a.skor);
    return cakismalar;
  }

  // ── Uyarı Modalı Göster ────────────────────────────────────
  function uyariGoster(kisiAd, cakismalar, devamFn) {
    const kesinVar = cakismalar.some(c => c.kesin);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'menfaat-uyari-modal';
    modal.style.cssText = 'z-index:99999';
    modal.innerHTML = `
      <div class="modal" style="max-width:580px;animation:modalIn .2s ease">
        <div class="modal-header" style="border-bottom-color:${kesinVar ? 'var(--red)' : '#e67e22'}">
          <div class="modal-title" style="color:${kesinVar ? 'var(--red)' : '#e67e22'}">
            ${kesinVar ? '🚫 Menfaat Çakışması Tespit Edildi!' : '⚠️ Olası Menfaat Çakışması'}
          </div>
        </div>
        <div class="modal-body" style="padding:16px 20px">
          <div style="background:${kesinVar ? 'var(--red-dim)' : 'rgba(230,126,34,.1)'};border:1px solid ${kesinVar ? 'var(--red)' : '#e67e22'};border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:12px;line-height:1.6;color:${kesinVar ? 'var(--red)' : '#e67e22'}">
            ${kesinVar
              ? '<strong>Avukatlık Kanunu m.38</strong> ve <strong>TBB Meslek Kuralları m.36</strong> gereği, menfaati çakışan tarafların aynı avukat tarafından temsili yasaktır.'
              : 'Aşağıdaki kayıtlar, eklemeye çalıştığınız kişi/kurum ile benzerlik göstermektedir. Lütfen kontrol edin.'}
          </div>

          <div style="font-size:12px;font-weight:700;margin-bottom:10px;color:var(--text)">
            Kontrol edilen: <span style="color:var(--gold)">"${escHTML(kisiAd)}"</span>
          </div>

          ${cakismalar.map(c => `
            <div style="background:var(--surface2);border:1px solid ${c.kesin ? 'var(--red)' : 'var(--border)'};border-left:4px solid ${c.kesin ? '#e74c3c' : '#e67e22'};border-radius:var(--radius);padding:12px 14px;margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <div style="font-size:13px;font-weight:700;color:var(--text)">${escHTML(c.hedefAd)}</div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${escHTML(c.hedefKaynak)}${c.davaNo ? ' · Dava: ' + escHTML(c.davaNo) : ''}${c.icraNo ? ' · İcra: ' + escHTML(c.icraNo) : ''}${c.arabKonu ? ' · ' + escHTML(c.arabKonu) : ''}</div>
                </div>
                <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px;background:${c.kesin ? 'var(--red-dim)' : 'rgba(230,126,34,.15)'};color:${c.kesin ? 'var(--red)' : '#e67e22'}">
                  ${c.kesin ? '🚫 KESİN' : '⚠️ OLASI'} %${c.skor}
                </span>
              </div>
              <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">
                ${c.eslesmeler.map(e => `
                  <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:${e.kesin ? 'rgba(231,76,60,.1)' : 'rgba(230,126,34,.1)'};color:${e.kesin ? '#e74c3c' : '#e67e22'};border:1px solid ${e.kesin ? 'rgba(231,76,60,.2)' : 'rgba(230,126,34,.2)'}">
                    ${escHTML(e.alan)}: ${escHTML(e.deger)}
                  </span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-outline" onclick="document.getElementById('menfaat-uyari-modal').remove()">
            ← Geri Dön
          </button>
          ${!kesinVar ? `
            <button class="btn btn-gold" onclick="document.getElementById('menfaat-uyari-modal').remove(); if(typeof _menfaatDevamFn==='function') _menfaatDevamFn();">
              ⚠️ Riski Kabul Et ve Devam Et
            </button>
          ` : `
            <div style="font-size:11px;color:var(--red);padding:8px 0;font-weight:600">
              🚫 Kesin çakışma — kayıt engellenmiştir
            </div>
          `}
        </div>
      </div>`;

    // Devam fonksiyonunu global'e koy (modal butonundan erişim için)
    window._menfaatDevamFn = devamFn || null;
    document.body.appendChild(modal);
  }

  // ── Rapor Modalı ───────────────────────────────────────────
  function raporGoster() {
    const cakismalar = tumSistemiTara();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'menfaat-rapor-modal';
    modal.style.cssText = 'z-index:99999';
    modal.innerHTML = `
      <div class="modal" style="max-width:700px;max-height:85vh;overflow-y:auto;animation:modalIn .2s ease">
        <div class="modal-header">
          <div class="modal-title">🔍 Menfaat Çakışması Raporu</div>
          <button class="modal-x-btn" onclick="document.getElementById('menfaat-rapor-modal').remove()">✕</button>
        </div>
        <div class="modal-body" style="padding:16px 20px">
          <div style="background:${cakismalar.length ? 'var(--red-dim)' : 'var(--green-dim)'};border:1px solid ${cakismalar.length ? 'var(--red)' : 'var(--green)'};border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;font-weight:600;color:${cakismalar.length ? 'var(--red)' : 'var(--green)'}">
            ${cakismalar.length
              ? `🚫 ${cakismalar.length} potansiyel çakışma tespit edildi! (${cakismalar.filter(c => c.kesin).length} kesin)`
              : '✅ Menfaat çakışması tespit edilmedi'}
          </div>

          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">
            Tarama: ${(state.muvekkillar||[]).length} müvekkil × ${(state.karsiTaraflar||[]).length + (state.davalar||[]).length + (state.icra||[]).length} karşı taraf/borçlu
          </div>

          ${cakismalar.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:8px">✅</div>Tüm kayıtlar temiz</div>' : ''}

          ${cakismalar.map((c, idx) => `
            <div style="background:var(--surface2);border:1px solid ${c.kesin ? 'rgba(231,76,60,.3)' : 'var(--border)'};border-radius:var(--radius);padding:14px;margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px;background:${c.kesin ? 'var(--red-dim)' : 'rgba(230,126,34,.15)'};color:${c.kesin ? 'var(--red)' : '#e67e22'}">
                  ${c.kesin ? '🚫 KESİN ÇAKIŞMA' : '⚠️ OLASI ÇAKIŞMA'} — %${c.skor}
                </span>
                <span style="font-size:10px;color:var(--text-dim)">#${idx + 1}</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center">
                <div style="background:var(--green-dim);border:1px solid var(--green);border-radius:6px;padding:10px;text-align:center">
                  <div style="font-size:9px;color:var(--green);font-weight:700;text-transform:uppercase;margin-bottom:4px">Müvekkil</div>
                  <div style="font-size:13px;font-weight:700;color:var(--text)">${escHTML(c.muvekkil.ad)}</div>
                  ${c.muvekkil.tc ? '<div style="font-size:10px;color:var(--text-muted);margin-top:2px">TC: ' + escHTML(c.muvekkil.tc) + '</div>' : ''}
                </div>
                <div style="font-size:24px;color:var(--red)">⚔️</div>
                <div style="background:var(--red-dim);border:1px solid var(--red);border-radius:6px;padding:10px;text-align:center">
                  <div style="font-size:9px;color:var(--red);font-weight:700;text-transform:uppercase;margin-bottom:4px">${escHTML(c.karsiTaraf.kaynak === 'karsiTaraf' ? 'Karşı Taraf' : c.karsiTaraf.kaynak === 'icraBorclu' ? 'İcra Borçlusu' : 'Dava Karşı Tarafı')}</div>
                  <div style="font-size:13px;font-weight:700;color:var(--text)">${escHTML(c.karsiTaraf.ad)}</div>
                  ${c.karsiTaraf.tc ? '<div style="font-size:10px;color:var(--text-muted);margin-top:2px">TC: ' + escHTML(c.karsiTaraf.tc) + '</div>' : ''}
                </div>
              </div>
              <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">
                ${c.eslesmeler.map(e => `
                  <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:${e.kesin ? 'rgba(231,76,60,.1)' : 'rgba(230,126,34,.1)'};color:${e.kesin ? '#e74c3c' : '#e67e22'}">
                    ${escHTML(e.alan)}: ${escHTML(e.deger)}
                  </span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;

    document.body.appendChild(modal);
  }

  // ── Public API ──────────────────────────────────────────────
  return {
    kontrolEt,
    tumSistemiTara,
    uyariGoster,
    raporGoster,
    ESIK_KESIN,
    ESIK_UYARI,
  };

})();
