// ================================================================
// LEXBASE — PESSIMİSTİC FORM SUBMIT SİSTEMİ
// js/modules/sync.js
//
// ❌ Arka plan auto-sync YOK
// ❌ Debounce / diff motoru YOK
// ✅ Form submit → await Supabase → başarılıysa kapat
// ✅ Hata → modal AÇIK kalır, veri korunur
// ✅ Loading state → buton disabled + spinner
// ✅ Merkezi hata yönetimi — sıfır sessiz hata
//
// KULLANIM:
//   var sonuc = await LexSubmit.kaydet('ihtarnameler', kayitObj);
//   if (sonuc.ok) { closeModal(...); renderXxx(); }
//   // Hata varsa LexSubmit zaten toast gösterir, modal açık kalır
//
// VEYA kısa yol:
//   await LexSubmit.formKaydet({
//     tablo: 'ihtarnameler',
//     kayit: veriObj,
//     modalId: 'ihtar-modal',
//     butonId: 'ihtar-kaydet-btn',
//     renderFn: function() { renderIhtarname(); updateBadges(); },
//     basariMesaj: '✓ İhtarname kaydedildi'
//   });
// ================================================================

var LexSubmit = (function () {

  // ── State key → Supabase tablo adı ─────────────────────────
  var TABLO_MAP = {
    'muvekkillar': 'muvekkillar',
    'karsiTaraflar': 'karsi_taraflar',
    'vekillar': 'vekillar',
    'davalar': 'davalar',
    'icra': 'icra',
    'butce': 'butce',
    'avanslar': 'avanslar',
    'etkinlikler': 'etkinlikler',
    'danismanlik': 'danismanlik',
    'arabuluculuk': 'arabuluculuk',
    'ihtarnameler': 'ihtarnameler',
    'todolar': 'todolar',
    'personel': 'personel',
    'finansIslemler': 'finans_islemler',
    'ucretAnlasmalari': 'ucret_anlasmalari',
    'buroGiderleri': 'buro_giderleri',
  };

  // ── ANA FONKSİYON: Pessimistic Kaydet ─────────────────────
  // Supabase yoksa sadece localStorage'a yazar (offline mod).
  // Supabase varsa ÖNCE Supabase'e yazar, başarılıysa localStorage.
  // Hata dönerse { ok:false, error:'...' } döner, toast gösterir.
  async function kaydet(stateKey, kayit) {
    var tablo = TABLO_MAP[stateKey] || stateKey;

    // ── Supabase aktif değilse → sadece localStorage ──
    if (typeof currentBuroId === 'undefined' || !currentBuroId || typeof sb === 'undefined') {
      _localKaydet(stateKey, kayit);
      return { ok: true, mode: 'local' };
    }

    // ── Supabase'e yaz (AWAIT — pessimistic) ──
    try {
      var id = kayit.id;
      var data = {};
      Object.keys(kayit).forEach(function (k) { if (k !== 'id') data[k] = kayit[k]; });

      var result = await sb.from(tablo).upsert({
        id: id,
        buro_id: currentBuroId,
        data: data
      });

      if (result.error) {
        _hataGoster(result.error, tablo);
        return { ok: false, error: result.error.message };
      }

      // ── Supabase başarılı → localStorage'a da yaz ──
      _localKaydet(stateKey, kayit);
      return { ok: true, mode: 'supabase' };

    } catch (e) {
      _hataGoster({ message: e.message }, tablo);
      return { ok: false, error: e.message };
    }
  }

  // ── SİLME: Pessimistic ─────────────────────────────────────
  async function sil(stateKey, id) {
    var tablo = TABLO_MAP[stateKey] || stateKey;

    if (typeof currentBuroId === 'undefined' || !currentBuroId || typeof sb === 'undefined') {
      _localSil(stateKey, id);
      return { ok: true, mode: 'local' };
    }

    try {
      var result = await sb.from(tablo).delete().eq('id', id).eq('buro_id', currentBuroId);

      if (result.error) {
        _hataGoster(result.error, tablo);
        return { ok: false, error: result.error.message };
      }

      _localSil(stateKey, id);
      return { ok: true, mode: 'supabase' };

    } catch (e) {
      _hataGoster({ message: e.message }, tablo);
      return { ok: false, error: e.message };
    }
  }

  // ── KISA YOL: Form Kaydet (Tam döngü) ─────────────────────
  // Buton loading → await Supabase → başarı: kapat/render
  //                                → hata: modal açık, buton reset
  async function formKaydet(opts) {
    /*
      opts = {
        tablo: 'ihtarnameler',      // state key
        kayit: { id, ... },         // kayıt objesi
        modalId: 'ihtar-modal',     // kapanacak modal
        butonId: 'ihtar-kaydet-btn', // loading state butonu (opsiyonel)
        butonEl: element,           // veya doğrudan element (opsiyonel)
        renderFn: function() {},    // başarıda çağrılacak render
        basariMesaj: '✓ Kaydedildi', // başarı toast
        stateArr: 'ihtarnameler',   // state dizisinin adı (opsiyonel, tablo ile aynıysa gerek yok)
        isEdit: false,              // düzenleme mi?
      }
    */

    var btn = opts.butonEl || (opts.butonId ? document.getElementById(opts.butonId) : null);
    var btnOrijinalHTML = '';

    // ── 1. Buton → Loading ──
    if (btn) {
      btnOrijinalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-spinner"></span> Kaydediliyor...';
    }

    // ── 2. Supabase'e yaz (pessimistic await) ──
    var sonuc = await kaydet(opts.tablo, opts.kayit);

    // ── 3. Sonuç değerlendir ──
    if (!sonuc.ok) {
      // ❌ HATA — Modal açık kalır, buton resetlenir
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = btnOrijinalHTML;
      }
      // Toast zaten _hataGoster'da gösterildi
      return false;
    }

    // ── 4. ✅ BAŞARI — State güncelle, modal kapat ──
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = btnOrijinalHTML;
    }

    if (opts.modalId) closeModal(opts.modalId);
    if (opts.renderFn) opts.renderFn();
    if (opts.basariMesaj) notify(opts.basariMesaj);

    return true;
  }

  // ── KISA YOL: Form Sil (Tam döngü) ────────────────────────
  async function formSil(opts) {
    /*
      opts = {
        tablo: 'ihtarnameler',
        id: 'xxx-yyy',
        onayMesaj: 'Silmek istediğinize emin misiniz?',
        renderFn: function() {},
        basariMesaj: 'Silindi',
      }
    */
    // Onay
    var onay = typeof silmeOnay === 'function'
      ? await silmeOnay('Kayıt', opts.onayMesaj || 'Bu kaydı silmek istediğinize emin misiniz?')
      : confirm(opts.onayMesaj || 'Bu kaydı silmek istediğinize emin misiniz?');
    if (!onay) return false;

    var sonuc = await sil(opts.tablo, opts.id);
    if (!sonuc.ok) return false;

    if (opts.renderFn) opts.renderFn();
    if (opts.basariMesaj) notify(opts.basariMesaj);
    return true;
  }

  // ── TOPLU KAYDET (birden fazla kayıt) ──────────────────────
  async function topluKaydet(stateKey, kayitlar) {
    var tablo = TABLO_MAP[stateKey] || stateKey;

    if (!currentBuroId || typeof sb === 'undefined') {
      kayitlar.forEach(function (k) { _localKaydet(stateKey, k); });
      return { ok: true, mode: 'local' };
    }

    try {
      var rows = kayitlar.map(function (kayit) {
        var id = kayit.id;
        var data = {};
        Object.keys(kayit).forEach(function (k) { if (k !== 'id') data[k] = kayit[k]; });
        return { id: id, buro_id: currentBuroId, data: data };
      });

      var result = await sb.from(tablo).upsert(rows);
      if (result.error) {
        _hataGoster(result.error, tablo);
        return { ok: false, error: result.error.message };
      }

      kayitlar.forEach(function (k) { _localKaydet(stateKey, k); });
      return { ok: true, mode: 'supabase', count: kayitlar.length };

    } catch (e) {
      _hataGoster({ message: e.message }, tablo);
      return { ok: false, error: e.message };
    }
  }

  // ================================================================
  // YARDIMCILAR
  // ================================================================

  // ── localStorage'a kaydet + snapshot güncelle ───────────────
  function _localKaydet(stateKey, kayit) {
    if (!state[stateKey]) state[stateKey] = [];
    var idx = state[stateKey].findIndex(function (x) { return x.id === kayit.id; });
    if (idx >= 0) {
      state[stateKey][idx] = kayit;
    } else {
      state[stateKey].push(kayit);
    }
    try { localStorage.setItem(SK, JSON.stringify(state)); }
    catch (e) { console.warn('[LexSubmit] localStorage yazma hatası:', e.message); }
    // Snapshot güncelle (diff engine'in bu kaydı tekrar sync etmesini engelle)
    if (typeof _takeSyncSnapshot === 'function') _takeSyncSnapshot();
  }

  // ── localStorage'dan sil + snapshot güncelle ───────────────
  function _localSil(stateKey, id) {
    if (!state[stateKey]) return;
    state[stateKey] = state[stateKey].filter(function (x) { return x.id !== id; });
    try { localStorage.setItem(SK, JSON.stringify(state)); }
    catch (e) { console.warn('[LexSubmit] localStorage yazma hatası:', e.message); }
    if (typeof _takeSyncSnapshot === 'function') _takeSyncSnapshot();
  }

  // ── MERKEZİ HATA YÖNETİMİ ─────────────────────────────────
  function _hataGoster(error, tablo) {
    var mesaj = error.message || 'Bilinmeyen hata';

    // Konsola detaylı log (her zaman)
    console.error('[LexSubmit] ❌ Hata (' + tablo + '):', mesaj, error);

    // Kullanıcıya kategorize edilmiş toast
    if (typeof notify === 'function') {
      if (mesaj.includes('row-level security') || mesaj.includes('policy') || mesaj.includes('403')) {
        notify('🔒 Yetkilendirme hatası — bu işlem için izniniz yok. Tekrar giriş yapmayı deneyin.');
      }
      else if (mesaj.includes('null value') || mesaj.includes('not-null') || mesaj.includes('violates')) {
        notify('⚠️ Veritabanı kısıtlama hatası: ' + mesaj);
      }
      else if (mesaj.includes('duplicate') || mesaj.includes('unique')) {
        notify('⚠️ Bu kayıt zaten mevcut (çift kayıt engellendi).');
      }
      else if (mesaj.includes('network') || mesaj.includes('fetch') || mesaj.includes('Failed')) {
        notify('📡 Bağlantı hatası — internet bağlantınızı kontrol edin. Kayıt yerel olarak saklandı.');
        // Offline durumda localStorage'a yaz ki veri kaybolmasın
      }
      else {
        notify('❌ Kaydedilemedi: ' + mesaj);
      }
    }
  }

  // ── PUBLIC API ─────────────────────────────────────────────
  return {
    kaydet: kaydet,
    sil: sil,
    formKaydet: formKaydet,
    formSil: formSil,
    topluKaydet: topluKaydet,
    TABLO_MAP: TABLO_MAP,
  };

})();
