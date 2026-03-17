/**
 * Türkiye Adliyeleri
 * 81 il bazında aktif adliye ve mülhakat adliyeleri listesi.
 *
 * ad       : Adliye adı
 * mulhakat : Bu adliyenin bağlı olduğu ana adliye (varsa)
 */

export const ADLIYELER: Record<string, Array<{ ad: string; mulhakat?: string }>> = {
  /* ────────────────────────── 01 ADANA ────────────────────────── */
  'Adana': [
    { ad: 'Adana' },
    { ad: 'Ceyhan' },
    { ad: 'Kozan' },
    { ad: 'Karaisalı', mulhakat: 'Adana' },
    { ad: 'Karataş', mulhakat: 'Adana' },
    { ad: 'Pozantı' },
    { ad: 'Aladağ', mulhakat: 'Kozan' },
    { ad: 'Feke', mulhakat: 'Kozan' },
    { ad: 'Saimbeyli', mulhakat: 'Kozan' },
    { ad: 'Tufanbeyli', mulhakat: 'Kozan' },
    { ad: 'İmamoğlu', mulhakat: 'Ceyhan' },
    { ad: 'Yumurtalık', mulhakat: 'Ceyhan' },
  ],

  /* ────────────────────────── 02 ADIYAMAN ────────────────────────── */
  'Adıyaman': [
    { ad: 'Adıyaman' },
    { ad: 'Besni' },
    { ad: 'Gölbaşı (Adıyaman)' },
    { ad: 'Kahta' },
    { ad: 'Gerger', mulhakat: 'Kahta' },
    { ad: 'Samsat', mulhakat: 'Adıyaman' },
    { ad: 'Sincik', mulhakat: 'Adıyaman' },
    { ad: 'Çelikhan', mulhakat: 'Adıyaman' },
    { ad: 'Tut', mulhakat: 'Besni' },
  ],

  /* ────────────────────────── 03 AFYONKARAHİSAR ────────────────────────── */
  'Afyonkarahisar': [
    { ad: 'Afyonkarahisar' },
    { ad: 'Bolvadin' },
    { ad: 'Dinar' },
    { ad: 'Emirdağ' },
    { ad: 'Sandıklı' },
    { ad: 'Çay' },
    { ad: 'Sultandağı', mulhakat: 'Çay' },
    { ad: 'Şuhut', mulhakat: 'Afyonkarahisar' },
    { ad: 'İhsaniye', mulhakat: 'Afyonkarahisar' },
    { ad: 'Sinanpaşa', mulhakat: 'Afyonkarahisar' },
    { ad: 'İscehisar', mulhakat: 'Afyonkarahisar' },
    { ad: 'Dazkırı', mulhakat: 'Dinar' },
    { ad: 'Evciler', mulhakat: 'Dinar' },
    { ad: 'Başmakçı', mulhakat: 'Dinar' },
  ],

  /* ────────────────────────── 04 AĞRI ────────────────────────── */
  'Ağrı': [
    { ad: 'Ağrı' },
    { ad: 'Doğubayazıt' },
    { ad: 'Diyadin' },
    { ad: 'Patnos' },
    { ad: 'Eleşkirt', mulhakat: 'Ağrı' },
    { ad: 'Hamur', mulhakat: 'Ağrı' },
    { ad: 'Taşlıçay', mulhakat: 'Ağrı' },
    { ad: 'Tutak', mulhakat: 'Patnos' },
  ],

  /* ────────────────────────── 05 AMASYA ────────────────────────── */
  'Amasya': [
    { ad: 'Amasya' },
    { ad: 'Merzifon' },
    { ad: 'Suluova' },
    { ad: 'Taşova' },
    { ad: 'Gümüşhacıköy', mulhakat: 'Merzifon' },
    { ad: 'Göynücek', mulhakat: 'Amasya' },
    { ad: 'Hamamözü', mulhakat: 'Amasya' },
  ],

  /* ────────────────────────── 06 ANKARA ────────────────────────── */
  'Ankara': [
    { ad: 'Ankara' },
    { ad: 'Ankara Batı (Sincan)' },
    { ad: 'Polatlı' },
    { ad: 'Beypazarı' },
    { ad: 'Haymana' },
    { ad: 'Şereflikoçhisar' },
    { ad: 'Çubuk' },
    { ad: 'Nallıhan', mulhakat: 'Beypazarı' },
    { ad: 'Güdül', mulhakat: 'Beypazarı' },
    { ad: 'Ayaş', mulhakat: 'Beypazarı' },
    { ad: 'Kızılcahamam' },
    { ad: 'Bala', mulhakat: 'Ankara' },
    { ad: 'Elmadağ', mulhakat: 'Ankara' },
    { ad: 'Kalecik', mulhakat: 'Ankara' },
    { ad: 'Evren', mulhakat: 'Şereflikoçhisar' },
    { ad: 'Çamlıdere', mulhakat: 'Kızılcahamam' },
    { ad: 'Kazan', mulhakat: 'Ankara Batı' },
  ],

  /* ────────────────────────── 07 ANTALYA ────────────────────────── */
  'Antalya': [
    { ad: 'Antalya' },
    { ad: 'Alanya' },
    { ad: 'Manavgat' },
    { ad: 'Serik' },
    { ad: 'Kumluca' },
    { ad: 'Elmalı' },
    { ad: 'Kaş' },
    { ad: 'Kemer', mulhakat: 'Antalya' },
    { ad: 'Finike' },
    { ad: 'Gazipaşa', mulhakat: 'Alanya' },
    { ad: 'Gündoğmuş', mulhakat: 'Alanya' },
    { ad: 'Akseki' },
    { ad: 'İbradı', mulhakat: 'Akseki' },
    { ad: 'Korkuteli' },
    { ad: 'Demre', mulhakat: 'Finike' },
  ],

  /* ────────────────────────── 08 ARTVİN ────────────────────────── */
  'Artvin': [
    { ad: 'Artvin' },
    { ad: 'Hopa' },
    { ad: 'Borçka' },
    { ad: 'Arhavi' },
    { ad: 'Şavşat' },
    { ad: 'Yusufeli' },
    { ad: 'Ardanuç', mulhakat: 'Artvin' },
    { ad: 'Murgul', mulhakat: 'Borçka' },
  ],

  /* ────────────────────────── 09 AYDIN ────────────────────────── */
  'Aydın': [
    { ad: 'Aydın' },
    { ad: 'Nazilli' },
    { ad: 'Söke' },
    { ad: 'Kuşadası' },
    { ad: 'Didim' },
    { ad: 'Çine' },
    { ad: 'Germencik', mulhakat: 'Aydın' },
    { ad: 'İncirliova', mulhakat: 'Aydın' },
    { ad: 'Bozdoğan' },
    { ad: 'Karacasu', mulhakat: 'Nazilli' },
    { ad: 'Sultanhisar', mulhakat: 'Nazilli' },
    { ad: 'Buharkent', mulhakat: 'Nazilli' },
    { ad: 'Yenipazar', mulhakat: 'Nazilli' },
    { ad: 'Kuyucak', mulhakat: 'Nazilli' },
    { ad: 'Koçarlı', mulhakat: 'Aydın' },
    { ad: 'Köşk', mulhakat: 'Aydın' },
  ],

  /* ────────────────────────── 10 BALIKESİR ────────────────────────── */
  'Balıkesir': [
    { ad: 'Balıkesir' },
    { ad: 'Bandırma' },
    { ad: 'Edremit' },
    { ad: 'Gönen' },
    { ad: 'Burhaniye' },
    { ad: 'Erdek' },
    { ad: 'Ayvalık' },
    { ad: 'Susurluk' },
    { ad: 'Bigadiç' },
    { ad: 'Dursunbey' },
    { ad: 'Sındırgı' },
    { ad: 'İvrindi', mulhakat: 'Balıkesir' },
    { ad: 'Havran', mulhakat: 'Edremit' },
    { ad: 'Manyas', mulhakat: 'Bandırma' },
    { ad: 'Savaştepe', mulhakat: 'Balıkesir' },
    { ad: 'Kepsut', mulhakat: 'Balıkesir' },
    { ad: 'Marmara', mulhakat: 'Erdek' },
    { ad: 'Balya', mulhakat: 'Balıkesir' },
  ],

  /* ────────────────────────── 11 BİLECİK ────────────────────────── */
  'Bilecik': [
    { ad: 'Bilecik' },
    { ad: 'Bolu (Bilecik)', mulhakat: 'Bilecik' },
    { ad: 'Söğüt' },
    { ad: 'Osmaneli' },
    { ad: 'Pazaryeri', mulhakat: 'Bilecik' },
    { ad: 'Gölpazarı', mulhakat: 'Bilecik' },
    { ad: 'İnhisar', mulhakat: 'Bilecik' },
    { ad: 'Yenipazar (Bilecik)', mulhakat: 'Bilecik' },
  ],

  /* ────────────────────────── 12 BİNGÖL ────────────────────────── */
  'Bingöl': [
    { ad: 'Bingöl' },
    { ad: 'Genç' },
    { ad: 'Karlıova' },
    { ad: 'Solhan' },
    { ad: 'Kiğı', mulhakat: 'Bingöl' },
    { ad: 'Adaklı', mulhakat: 'Bingöl' },
    { ad: 'Yayladere', mulhakat: 'Bingöl' },
    { ad: 'Yedisu', mulhakat: 'Bingöl' },
  ],

  /* ────────────────────────── 13 BİTLİS ────────────────────────── */
  'Bitlis': [
    { ad: 'Bitlis' },
    { ad: 'Tatvan' },
    { ad: 'Ahlat' },
    { ad: 'Adilcevaz', mulhakat: 'Ahlat' },
    { ad: 'Hizan', mulhakat: 'Bitlis' },
    { ad: 'Güroymak' },
    { ad: 'Mutki', mulhakat: 'Bitlis' },
  ],

  /* ────────────────────────── 14 BOLU ────────────────────────── */
  'Bolu': [
    { ad: 'Bolu' },
    { ad: 'Gerede' },
    { ad: 'Göynük', mulhakat: 'Bolu' },
    { ad: 'Mengen', mulhakat: 'Bolu' },
    { ad: 'Mudurnu', mulhakat: 'Bolu' },
    { ad: 'Seben', mulhakat: 'Bolu' },
    { ad: 'Dörtdivan', mulhakat: 'Bolu' },
    { ad: 'Kıbrıscık', mulhakat: 'Bolu' },
    { ad: 'Yeniçağa', mulhakat: 'Bolu' },
  ],

  /* ────────────────────────── 15 BURDUR ────────────────────────── */
  'Burdur': [
    { ad: 'Burdur' },
    { ad: 'Bucak' },
    { ad: 'Gölhisar' },
    { ad: 'Tefenni', mulhakat: 'Burdur' },
    { ad: 'Yeşilova', mulhakat: 'Burdur' },
    { ad: 'Ağlasun', mulhakat: 'Burdur' },
    { ad: 'Çavdır', mulhakat: 'Gölhisar' },
    { ad: 'Altınyayla (Burdur)', mulhakat: 'Gölhisar' },
    { ad: 'Karamanlı', mulhakat: 'Bucak' },
    { ad: 'Çeltikçi', mulhakat: 'Burdur' },
    { ad: 'Kemer (Burdur)', mulhakat: 'Burdur' },
  ],

  /* ────────────────────────── 16 BURSA ────────────────────────── */
  'Bursa': [
    { ad: 'Bursa' },
    { ad: 'İnegöl' },
    { ad: 'Gemlik' },
    { ad: 'Mustafakemalpaşa' },
    { ad: 'Orhangazi' },
    { ad: 'Karacabey' },
    { ad: 'Yenişehir' },
    { ad: 'İznik' },
    { ad: 'Mudanya', mulhakat: 'Bursa' },
    { ad: 'Keles', mulhakat: 'Bursa' },
    { ad: 'Orhaneli', mulhakat: 'Bursa' },
    { ad: 'Büyükorhan', mulhakat: 'Orhaneli' },
    { ad: 'Harmancık', mulhakat: 'Bursa' },
  ],

  /* ────────────────────────── 17 ÇANAKKALE ────────────────────────── */
  'Çanakkale': [
    { ad: 'Çanakkale' },
    { ad: 'Biga' },
    { ad: 'Çan' },
    { ad: 'Gelibolu' },
    { ad: 'Ezine' },
    { ad: 'Ayvacık' },
    { ad: 'Bayramiç' },
    { ad: 'Lapseki', mulhakat: 'Çanakkale' },
    { ad: 'Yenice', mulhakat: 'Biga' },
    { ad: 'Eceabat', mulhakat: 'Gelibolu' },
    { ad: 'Gökçeada' },
    { ad: 'Bozcaada', mulhakat: 'Çanakkale' },
  ],

  /* ────────────────────────── 18 ÇANKIRI ────────────────────────── */
  'Çankırı': [
    { ad: 'Çankırı' },
    { ad: 'Çerkeş' },
    { ad: 'Ilgaz' },
    { ad: 'Kurşunlu', mulhakat: 'Çankırı' },
    { ad: 'Orta', mulhakat: 'Çankırı' },
    { ad: 'Şabanözü', mulhakat: 'Çankırı' },
    { ad: 'Yapraklı', mulhakat: 'Çankırı' },
    { ad: 'Eldivan', mulhakat: 'Çankırı' },
    { ad: 'Kızılırmak', mulhakat: 'Çankırı' },
    { ad: 'Bayramören', mulhakat: 'Çankırı' },
    { ad: 'Korgun', mulhakat: 'Çankırı' },
    { ad: 'Atkaracalar', mulhakat: 'Çankırı' },
  ],

  /* ────────────────────────── 19 ÇORUM ────────────────────────── */
  'Çorum': [
    { ad: 'Çorum' },
    { ad: 'Alaca' },
    { ad: 'İskilip' },
    { ad: 'Osmancık' },
    { ad: 'Sungurlu' },
    { ad: 'Bayat', mulhakat: 'Çorum' },
    { ad: 'Kargı', mulhakat: 'Osmancık' },
    { ad: 'Mecitözü', mulhakat: 'Çorum' },
    { ad: 'Ortaköy (Çorum)', mulhakat: 'Çorum' },
    { ad: 'Dodurga', mulhakat: 'Çorum' },
    { ad: 'Laçin', mulhakat: 'Çorum' },
    { ad: 'Oğuzlar', mulhakat: 'Çorum' },
    { ad: 'Boğazkale', mulhakat: 'Sungurlu' },
    { ad: 'Uğurludağ', mulhakat: 'Çorum' },
  ],

  /* ────────────────────────── 20 DENİZLİ ────────────────────────── */
  'Denizli': [
    { ad: 'Denizli' },
    { ad: 'Acıpayam' },
    { ad: 'Buldan' },
    { ad: 'Çivril' },
    { ad: 'Tavas' },
    { ad: 'Sarayköy' },
    { ad: 'Çal' },
    { ad: 'Honaz', mulhakat: 'Denizli' },
    { ad: 'Serinhisar', mulhakat: 'Acıpayam' },
    { ad: 'Güney', mulhakat: 'Denizli' },
    { ad: 'Çameli' },
    { ad: 'Kale', mulhakat: 'Tavas' },
    { ad: 'Bozkurt (Denizli)', mulhakat: 'Çivril' },
    { ad: 'Baklan', mulhakat: 'Çivril' },
    { ad: 'Beyağaç', mulhakat: 'Çameli' },
    { ad: 'Babadağ', mulhakat: 'Sarayköy' },
  ],

  /* ────────────────────────── 21 DİYARBAKIR ────────────────────────── */
  'Diyarbakır': [
    { ad: 'Diyarbakır' },
    { ad: 'Bismil' },
    { ad: 'Çermik' },
    { ad: 'Çüngüş', mulhakat: 'Çermik' },
    { ad: 'Dicle', mulhakat: 'Diyarbakır' },
    { ad: 'Ergani' },
    { ad: 'Hani', mulhakat: 'Diyarbakır' },
    { ad: 'Hazro', mulhakat: 'Diyarbakır' },
    { ad: 'Kulp', mulhakat: 'Diyarbakır' },
    { ad: 'Lice' },
    { ad: 'Silvan' },
    { ad: 'Eğil', mulhakat: 'Diyarbakır' },
    { ad: 'Kocaköy', mulhakat: 'Diyarbakır' },
    { ad: 'Çınar', mulhakat: 'Diyarbakır' },
  ],

  /* ────────────────────────── 22 EDİRNE ────────────────────────── */
  'Edirne': [
    { ad: 'Edirne' },
    { ad: 'Keşan' },
    { ad: 'Uzunköprü' },
    { ad: 'İpsala' },
    { ad: 'Havsa', mulhakat: 'Edirne' },
    { ad: 'Enez', mulhakat: 'Keşan' },
    { ad: 'Meriç', mulhakat: 'Uzunköprü' },
    { ad: 'Süloğlu', mulhakat: 'Edirne' },
    { ad: 'Lalapaşa', mulhakat: 'Edirne' },
  ],

  /* ────────────────────────── 23 ELAZIĞ ────────────────────────── */
  'Elazığ': [
    { ad: 'Elazığ' },
    { ad: 'Karakoçan' },
    { ad: 'Kovancılar' },
    { ad: 'Palu' },
    { ad: 'Maden' },
    { ad: 'Keban', mulhakat: 'Elazığ' },
    { ad: 'Baskil', mulhakat: 'Elazığ' },
    { ad: 'Sivrice', mulhakat: 'Elazığ' },
    { ad: 'Arıcak', mulhakat: 'Elazığ' },
    { ad: 'Ağın', mulhakat: 'Keban' },
    { ad: 'Alacakaya', mulhakat: 'Maden' },
  ],

  /* ────────────────────────── 24 ERZİNCAN ────────────────────────── */
  'Erzincan': [
    { ad: 'Erzincan' },
    { ad: 'Tercan' },
    { ad: 'Üzümlü', mulhakat: 'Erzincan' },
    { ad: 'Refahiye' },
    { ad: 'Kemaliye' },
    { ad: 'İliç', mulhakat: 'Kemaliye' },
    { ad: 'Kemah', mulhakat: 'Erzincan' },
    { ad: 'Çayırlı', mulhakat: 'Tercan' },
    { ad: 'Otlukbeli', mulhakat: 'Erzincan' },
  ],

  /* ────────────────────────── 25 ERZURUM ────────────────────────── */
  'Erzurum': [
    { ad: 'Erzurum' },
    { ad: 'Oltu' },
    { ad: 'Horasan' },
    { ad: 'Pasinler' },
    { ad: 'Hınıs' },
    { ad: 'İspir' },
    { ad: 'Tortum', mulhakat: 'Erzurum' },
    { ad: 'Aşkale' },
    { ad: 'Narman', mulhakat: 'Oltu' },
    { ad: 'Olur', mulhakat: 'Oltu' },
    { ad: 'Şenkaya', mulhakat: 'Oltu' },
    { ad: 'Karayazı', mulhakat: 'Hınıs' },
    { ad: 'Karaçoban', mulhakat: 'Hınıs' },
    { ad: 'Tekman', mulhakat: 'Erzurum' },
    { ad: 'Köprüköy', mulhakat: 'Pasinler' },
    { ad: 'Uzundere', mulhakat: 'Tortum' },
    { ad: 'Çat', mulhakat: 'Erzurum' },
    { ad: 'Pazaryolu', mulhakat: 'Erzurum' },
    { ad: 'Ilıca', mulhakat: 'Erzurum' },
  ],

  /* ────────────────────────── 26 ESKİŞEHİR ────────────────────────── */
  'Eskişehir': [
    { ad: 'Eskişehir' },
    { ad: 'Sivrihisar' },
    { ad: 'Çifteler' },
    { ad: 'Mihalıççık', mulhakat: 'Eskişehir' },
    { ad: 'Seyitgazi', mulhakat: 'Eskişehir' },
    { ad: 'Alpu', mulhakat: 'Eskişehir' },
    { ad: 'Beylikova', mulhakat: 'Eskişehir' },
    { ad: 'Sarıcakaya', mulhakat: 'Eskişehir' },
    { ad: 'Mahmudiye', mulhakat: 'Çifteler' },
    { ad: 'Günyüzü', mulhakat: 'Sivrihisar' },
    { ad: 'Han', mulhakat: 'Eskişehir' },
    { ad: 'İnönü', mulhakat: 'Eskişehir' },
    { ad: 'Mihalgazi', mulhakat: 'Eskişehir' },
  ],

  /* ────────────────────────── 27 GAZİANTEP ────────────────────────── */
  'Gaziantep': [
    { ad: 'Gaziantep' },
    { ad: 'Nizip' },
    { ad: 'İslahiye' },
    { ad: 'Nurdağı', mulhakat: 'İslahiye' },
    { ad: 'Oğuzeli', mulhakat: 'Gaziantep' },
    { ad: 'Araban', mulhakat: 'Nizip' },
    { ad: 'Yavuzeli', mulhakat: 'Nizip' },
    { ad: 'Karkamış', mulhakat: 'Nizip' },
    { ad: 'Şahinbey', mulhakat: 'Gaziantep' },
    { ad: 'Şehitkamil', mulhakat: 'Gaziantep' },
  ],

  /* ────────────────────────── 28 GİRESUN ────────────────────────── */
  'Giresun': [
    { ad: 'Giresun' },
    { ad: 'Bulancak' },
    { ad: 'Espiye' },
    { ad: 'Görele' },
    { ad: 'Şebinkarahisar' },
    { ad: 'Tirebolu' },
    { ad: 'Dereli', mulhakat: 'Giresun' },
    { ad: 'Eynesil', mulhakat: 'Görele' },
    { ad: 'Keşap', mulhakat: 'Giresun' },
    { ad: 'Piraziz', mulhakat: 'Bulancak' },
    { ad: 'Alucra', mulhakat: 'Şebinkarahisar' },
    { ad: 'Güce', mulhakat: 'Giresun' },
    { ad: 'Yağlıdere', mulhakat: 'Giresun' },
    { ad: 'Çanakçı', mulhakat: 'Giresun' },
    { ad: 'Çamoluk', mulhakat: 'Şebinkarahisar' },
    { ad: 'Doğankent', mulhakat: 'Giresun' },
  ],

  /* ────────────────────────── 29 GÜMÜŞHANE ────────────────────────── */
  'Gümüşhane': [
    { ad: 'Gümüşhane' },
    { ad: 'Kelkit' },
    { ad: 'Şiran' },
    { ad: 'Torul', mulhakat: 'Gümüşhane' },
    { ad: 'Köse', mulhakat: 'Gümüşhane' },
    { ad: 'Kürtün', mulhakat: 'Gümüşhane' },
  ],

  /* ────────────────────────── 30 HAKKARİ ────────────────────────── */
  'Hakkari': [
    { ad: 'Hakkari' },
    { ad: 'Yüksekova' },
    { ad: 'Çukurca' },
    { ad: 'Şemdinli' },
    { ad: 'Derecik', mulhakat: 'Şemdinli' },
  ],

  /* ────────────────────────── 31 HATAY ────────────────────────── */
  'Hatay': [
    { ad: 'Hatay' },
    { ad: 'İskenderun' },
    { ad: 'Dörtyol' },
    { ad: 'Kırıkhan' },
    { ad: 'Reyhanlı' },
    { ad: 'Samandağ' },
    { ad: 'Altınözü', mulhakat: 'Hatay' },
    { ad: 'Hassa', mulhakat: 'Kırıkhan' },
    { ad: 'Erzin', mulhakat: 'Dörtyol' },
    { ad: 'Yayladağı', mulhakat: 'Hatay' },
    { ad: 'Kumlu', mulhakat: 'Reyhanlı' },
    { ad: 'Belen', mulhakat: 'İskenderun' },
    { ad: 'Arsuz', mulhakat: 'İskenderun' },
    { ad: 'Payas', mulhakat: 'Dörtyol' },
    { ad: 'Defne', mulhakat: 'Hatay' },
  ],

  /* ────────────────────────── 32 ISPARTA ────────────────────────── */
  'Isparta': [
    { ad: 'Isparta' },
    { ad: 'Eğirdir' },
    { ad: 'Yalvaç' },
    { ad: 'Şarkikaraağaç' },
    { ad: 'Gelendost', mulhakat: 'Eğirdir' },
    { ad: 'Senirkent', mulhakat: 'Isparta' },
    { ad: 'Uluborlu', mulhakat: 'Senirkent' },
    { ad: 'Keçiborlu', mulhakat: 'Isparta' },
    { ad: 'Gönen (Isparta)', mulhakat: 'Isparta' },
    { ad: 'Atabey', mulhakat: 'Isparta' },
    { ad: 'Sütçüler', mulhakat: 'Isparta' },
    { ad: 'Aksu (Isparta)', mulhakat: 'Isparta' },
    { ad: 'Yenişarbademli', mulhakat: 'Şarkikaraağaç' },
  ],

  /* ────────────────────────── 33 MERSİN ────────────────────────── */
  'Mersin': [
    { ad: 'Mersin' },
    { ad: 'Tarsus' },
    { ad: 'Silifke' },
    { ad: 'Erdemli' },
    { ad: 'Anamur' },
    { ad: 'Mut' },
    { ad: 'Gülnar' },
    { ad: 'Bozyazı', mulhakat: 'Anamur' },
    { ad: 'Aydıncık', mulhakat: 'Gülnar' },
    { ad: 'Çamlıyayla', mulhakat: 'Tarsus' },
  ],

  /* ────────────────────────── 34 İSTANBUL ────────────────────────── */
  'İstanbul': [
    { ad: 'İstanbul (Çağlayan)' },
    { ad: 'İstanbul Anadolu (Kartal)' },
    { ad: 'Bakırköy' },
    { ad: 'Büyükçekmece' },
    { ad: 'Gaziosmanpaşa' },
    { ad: 'Küçükçekmece' },
    { ad: 'Silivri', mulhakat: 'Bakırköy' },
    { ad: 'Çatalca', mulhakat: 'Bakırköy' },
    { ad: 'Şile', mulhakat: 'İstanbul Anadolu' },
    { ad: 'Adalar', mulhakat: 'İstanbul Anadolu' },
    { ad: 'Beykoz', mulhakat: 'İstanbul Anadolu' },
  ],

  /* ────────────────────────── 35 İZMİR ────────────────────────── */
  'İzmir': [
    { ad: 'İzmir' },
    { ad: 'Karşıyaka' },
    { ad: 'Ödemiş' },
    { ad: 'Bergama' },
    { ad: 'Tire' },
    { ad: 'Menemen' },
    { ad: 'Torbalı' },
    { ad: 'Aliağa' },
    { ad: 'Dikili', mulhakat: 'Bergama' },
    { ad: 'Foça', mulhakat: 'Aliağa' },
    { ad: 'Çeşme' },
    { ad: 'Kemalpaşa', mulhakat: 'İzmir' },
    { ad: 'Kiraz' },
    { ad: 'Bayındır', mulhakat: 'Tire' },
    { ad: 'Selçuk', mulhakat: 'İzmir' },
    { ad: 'Seferihisar', mulhakat: 'İzmir' },
    { ad: 'Urla', mulhakat: 'İzmir' },
    { ad: 'Menderes', mulhakat: 'İzmir' },
    { ad: 'Beydağ', mulhakat: 'Ödemiş' },
    { ad: 'Karaburun', mulhakat: 'Çeşme' },
  ],

  /* ────────────────────────── 36 KARS ────────────────────────── */
  'Kars': [
    { ad: 'Kars' },
    { ad: 'Sarıkamış' },
    { ad: 'Kağızman' },
    { ad: 'Digor', mulhakat: 'Kars' },
    { ad: 'Arpaçay', mulhakat: 'Kars' },
    { ad: 'Akyaka', mulhakat: 'Kars' },
    { ad: 'Susuz', mulhakat: 'Kars' },
    { ad: 'Selim', mulhakat: 'Kars' },
  ],

  /* ────────────────────────── 37 KASTAMONU ────────────────────────── */
  'Kastamonu': [
    { ad: 'Kastamonu' },
    { ad: 'Tosya' },
    { ad: 'Taşköprü' },
    { ad: 'İnebolu' },
    { ad: 'Cide' },
    { ad: 'Araç' },
    { ad: 'Daday', mulhakat: 'Kastamonu' },
    { ad: 'Devrekani', mulhakat: 'Kastamonu' },
    { ad: 'Abana', mulhakat: 'İnebolu' },
    { ad: 'Bozkurt (Kastamonu)', mulhakat: 'İnebolu' },
    { ad: 'Çatalzeytin', mulhakat: 'İnebolu' },
    { ad: 'Küre', mulhakat: 'Kastamonu' },
    { ad: 'İhsangazi', mulhakat: 'Kastamonu' },
    { ad: 'Şenpazar', mulhakat: 'Cide' },
    { ad: 'Azdavay', mulhakat: 'Cide' },
    { ad: 'Pınarbaşı (Kastamonu)', mulhakat: 'Cide' },
    { ad: 'Ağlı', mulhakat: 'Araç' },
    { ad: 'Doğanyurt', mulhakat: 'İnebolu' },
    { ad: 'Seydiler', mulhakat: 'Kastamonu' },
    { ad: 'Hanönü', mulhakat: 'Taşköprü' },
  ],

  /* ────────────────────────── 38 KAYSERİ ────────────────────────── */
  'Kayseri': [
    { ad: 'Kayseri' },
    { ad: 'Develi' },
    { ad: 'Bünyan' },
    { ad: 'Yahyalı' },
    { ad: 'Pınarbaşı (Kayseri)' },
    { ad: 'Tomarza' },
    { ad: 'Sarıoğlan', mulhakat: 'Kayseri' },
    { ad: 'Sarız', mulhakat: 'Pınarbaşı (Kayseri)' },
    { ad: 'Felahiye', mulhakat: 'Kayseri' },
    { ad: 'İncesu', mulhakat: 'Kayseri' },
    { ad: 'Yeşilhisar', mulhakat: 'Develi' },
    { ad: 'Özvatan', mulhakat: 'Kayseri' },
    { ad: 'Akkışla', mulhakat: 'Kayseri' },
    { ad: 'Talas', mulhakat: 'Kayseri' },
    { ad: 'Hacılar', mulhakat: 'Kayseri' },
  ],

  /* ────────────────────────── 39 KIRKLARELİ ────────────────────────── */
  'Kırklareli': [
    { ad: 'Kırklareli' },
    { ad: 'Lüleburgaz' },
    { ad: 'Babaeski' },
    { ad: 'Vize' },
    { ad: 'Pınarhisar', mulhakat: 'Kırklareli' },
    { ad: 'Demirköy', mulhakat: 'Kırklareli' },
    { ad: 'Kofçaz', mulhakat: 'Kırklareli' },
    { ad: 'Pehlivanköy', mulhakat: 'Babaeski' },
  ],

  /* ────────────────────────── 40 KIRŞEHİR ────────────────────────── */
  'Kırşehir': [
    { ad: 'Kırşehir' },
    { ad: 'Kaman' },
    { ad: 'Mucur' },
    { ad: 'Çiçekdağı', mulhakat: 'Kırşehir' },
    { ad: 'Akpınar', mulhakat: 'Kırşehir' },
    { ad: 'Akçakent', mulhakat: 'Kırşehir' },
    { ad: 'Boztepe', mulhakat: 'Kırşehir' },
  ],

  /* ────────────────────────── 41 KOCAELİ ────────────────────────── */
  'Kocaeli': [
    { ad: 'Kocaeli' },
    { ad: 'Gebze' },
    { ad: 'Gölcük' },
    { ad: 'Kandıra' },
    { ad: 'Karamürsel' },
    { ad: 'Körfez', mulhakat: 'Kocaeli' },
    { ad: 'Derince', mulhakat: 'Kocaeli' },
    { ad: 'Dilovası', mulhakat: 'Gebze' },
    { ad: 'Çayırova', mulhakat: 'Gebze' },
    { ad: 'Darıca', mulhakat: 'Gebze' },
    { ad: 'Başiskele', mulhakat: 'Kocaeli' },
    { ad: 'Kartepe', mulhakat: 'Kocaeli' },
  ],

  /* ────────────────────────── 42 KONYA ────────────────────────── */
  'Konya': [
    { ad: 'Konya' },
    { ad: 'Ereğli (Konya)' },
    { ad: 'Akşehir' },
    { ad: 'Beyşehir' },
    { ad: 'Seydişehir' },
    { ad: 'Cihanbeyli' },
    { ad: 'Kulu' },
    { ad: 'Karapınar' },
    { ad: 'Ilgın' },
    { ad: 'Çumra' },
    { ad: 'Bozkır' },
    { ad: 'Doğanhisar', mulhakat: 'Akşehir' },
    { ad: 'Kadınhanı' },
    { ad: 'Sarayönü', mulhakat: 'Konya' },
    { ad: 'Yunak' },
    { ad: 'Hadim' },
    { ad: 'Hüyük', mulhakat: 'Beyşehir' },
    { ad: 'Taşkent', mulhakat: 'Hadim' },
    { ad: 'Güneysınır', mulhakat: 'Konya' },
    { ad: 'Tuzlukçu', mulhakat: 'Ilgın' },
    { ad: 'Altınekin', mulhakat: 'Konya' },
    { ad: 'Derebucak', mulhakat: 'Beyşehir' },
    { ad: 'Ahırlı', mulhakat: 'Seydişehir' },
    { ad: 'Yalıhüyük', mulhakat: 'Seydişehir' },
    { ad: 'Halkapınar', mulhakat: 'Ereğli (Konya)' },
    { ad: 'Emirgazi', mulhakat: 'Karapınar' },
    { ad: 'Çeltik', mulhakat: 'Yunak' },
    { ad: 'Derbent', mulhakat: 'Çumra' },
  ],

  /* ────────────────────────── 43 KÜTAHYA ────────────────────────── */
  'Kütahya': [
    { ad: 'Kütahya' },
    { ad: 'Tavşanlı' },
    { ad: 'Simav' },
    { ad: 'Gediz' },
    { ad: 'Emet' },
    { ad: 'Domaniç', mulhakat: 'Kütahya' },
    { ad: 'Altıntaş', mulhakat: 'Kütahya' },
    { ad: 'Aslanapa', mulhakat: 'Kütahya' },
    { ad: 'Çavdarhisar', mulhakat: 'Kütahya' },
    { ad: 'Dumlupınar', mulhakat: 'Kütahya' },
    { ad: 'Hisarcık', mulhakat: 'Gediz' },
    { ad: 'Pazarlar', mulhakat: 'Gediz' },
    { ad: 'Şaphane', mulhakat: 'Gediz' },
  ],

  /* ────────────────────────── 44 MALATYA ────────────────────────── */
  'Malatya': [
    { ad: 'Malatya' },
    { ad: 'Darende' },
    { ad: 'Akçadağ' },
    { ad: 'Doğanşehir' },
    { ad: 'Hekimhan' },
    { ad: 'Yeşilyurt', mulhakat: 'Malatya' },
    { ad: 'Battalgazi', mulhakat: 'Malatya' },
    { ad: 'Arapgir' },
    { ad: 'Arguvan', mulhakat: 'Malatya' },
    { ad: 'Pütürge' },
    { ad: 'Kuluncak', mulhakat: 'Hekimhan' },
    { ad: 'Yazıhan', mulhakat: 'Malatya' },
    { ad: 'Kale (Malatya)', mulhakat: 'Malatya' },
    { ad: 'Doğanyol', mulhakat: 'Pütürge' },
  ],

  /* ────────────────────────── 45 MANİSA ────────────────────────── */
  'Manisa': [
    { ad: 'Manisa' },
    { ad: 'Akhisar' },
    { ad: 'Turgutlu' },
    { ad: 'Salihli' },
    { ad: 'Soma' },
    { ad: 'Alaşehir' },
    { ad: 'Kula' },
    { ad: 'Sarıgöl', mulhakat: 'Alaşehir' },
    { ad: 'Demirci' },
    { ad: 'Gördes' },
    { ad: 'Kırkağaç' },
    { ad: 'Saruhanlı', mulhakat: 'Manisa' },
    { ad: 'Selendi', mulhakat: 'Kula' },
    { ad: 'Ahmetli', mulhakat: 'Turgutlu' },
    { ad: 'Gölmarmara', mulhakat: 'Salihli' },
    { ad: 'Köprübaşı', mulhakat: 'Gördes' },
  ],

  /* ────────────────────────── 46 KAHRAMANMARAŞ ────────────────────────── */
  'Kahramanmaraş': [
    { ad: 'Kahramanmaraş' },
    { ad: 'Elbistan' },
    { ad: 'Afşin' },
    { ad: 'Göksun' },
    { ad: 'Pazarcık' },
    { ad: 'Türkoğlu', mulhakat: 'Kahramanmaraş' },
    { ad: 'Andırın', mulhakat: 'Kahramanmaraş' },
    { ad: 'Çağlayancerit', mulhakat: 'Kahramanmaraş' },
    { ad: 'Ekinözü', mulhakat: 'Elbistan' },
    { ad: 'Nurhak', mulhakat: 'Elbistan' },
  ],

  /* ────────────────────────── 47 MARDİN ────────────────────────── */
  'Mardin': [
    { ad: 'Mardin' },
    { ad: 'Kızıltepe' },
    { ad: 'Midyat' },
    { ad: 'Nusaybin' },
    { ad: 'Derik' },
    { ad: 'Mazıdağı', mulhakat: 'Derik' },
    { ad: 'Ömerli', mulhakat: 'Mardin' },
    { ad: 'Savur', mulhakat: 'Mardin' },
    { ad: 'Dargeçit', mulhakat: 'Midyat' },
    { ad: 'Yeşilli', mulhakat: 'Mardin' },
  ],

  /* ────────────────────────── 48 MUĞLA ────────────────────────── */
  'Muğla': [
    { ad: 'Muğla' },
    { ad: 'Bodrum' },
    { ad: 'Fethiye' },
    { ad: 'Marmaris' },
    { ad: 'Milas' },
    { ad: 'Datça', mulhakat: 'Marmaris' },
    { ad: 'Dalaman' },
    { ad: 'Köyceğiz' },
    { ad: 'Ortaca', mulhakat: 'Dalaman' },
    { ad: 'Ula', mulhakat: 'Muğla' },
    { ad: 'Yatağan' },
    { ad: 'Kavaklıdere', mulhakat: 'Yatağan' },
    { ad: 'Seydikemer', mulhakat: 'Fethiye' },
    { ad: 'Menteşe', mulhakat: 'Muğla' },
  ],

  /* ────────────────────────── 49 MUŞ ────────────────────────── */
  'Muş': [
    { ad: 'Muş' },
    { ad: 'Bulanık' },
    { ad: 'Malazgirt' },
    { ad: 'Varto' },
    { ad: 'Hasköy', mulhakat: 'Muş' },
    { ad: 'Korkut', mulhakat: 'Muş' },
  ],

  /* ────────────────────────── 50 NEVŞEHİR ────────────────────────── */
  'Nevşehir': [
    { ad: 'Nevşehir' },
    { ad: 'Ürgüp' },
    { ad: 'Avanos' },
    { ad: 'Gülşehir', mulhakat: 'Nevşehir' },
    { ad: 'Hacıbektaş' },
    { ad: 'Kozaklı', mulhakat: 'Nevşehir' },
    { ad: 'Derinkuyu' },
    { ad: 'Acıgöl', mulhakat: 'Nevşehir' },
  ],

  /* ────────────────────────── 51 NİĞDE ────────────────────────── */
  'Niğde': [
    { ad: 'Niğde' },
    { ad: 'Bor' },
    { ad: 'Çamardı', mulhakat: 'Niğde' },
    { ad: 'Ulukışla' },
    { ad: 'Altunhisar', mulhakat: 'Bor' },
    { ad: 'Çiftlik', mulhakat: 'Niğde' },
  ],

  /* ────────────────────────── 52 ORDU ────────────────────────── */
  'Ordu': [
    { ad: 'Ordu' },
    { ad: 'Ünye' },
    { ad: 'Fatsa' },
    { ad: 'Korgan' },
    { ad: 'Kumru', mulhakat: 'Korgan' },
    { ad: 'Perşembe', mulhakat: 'Ordu' },
    { ad: 'Ulubey', mulhakat: 'Ordu' },
    { ad: 'Gölköy' },
    { ad: 'Mesudiye' },
    { ad: 'Akkuş' },
    { ad: 'Aybastı' },
    { ad: 'İkizce', mulhakat: 'Ünye' },
    { ad: 'Gülyalı', mulhakat: 'Ordu' },
    { ad: 'Çamaş', mulhakat: 'Ordu' },
    { ad: 'Çatalpınar', mulhakat: 'Fatsa' },
    { ad: 'Kabataş', mulhakat: 'Fatsa' },
    { ad: 'Kabadüz', mulhakat: 'Ordu' },
    { ad: 'Çaybaşı', mulhakat: 'Fatsa' },
  ],

  /* ────────────────────────── 53 RİZE ────────────────────────── */
  'Rize': [
    { ad: 'Rize' },
    { ad: 'Ardeşen' },
    { ad: 'Çamlıhemşin', mulhakat: 'Ardeşen' },
    { ad: 'Çayeli' },
    { ad: 'Fındıklı' },
    { ad: 'Pazar' },
    { ad: 'İkizdere', mulhakat: 'Rize' },
    { ad: 'Kalkandere', mulhakat: 'Rize' },
    { ad: 'Derepazarı', mulhakat: 'Rize' },
    { ad: 'Güneysu', mulhakat: 'Rize' },
    { ad: 'Hemşin', mulhakat: 'Rize' },
    { ad: 'İyidere', mulhakat: 'Rize' },
  ],

  /* ────────────────────────── 54 SAKARYA ────────────────────────── */
  'Sakarya': [
    { ad: 'Sakarya' },
    { ad: 'Geyve' },
    { ad: 'Hendek' },
    { ad: 'Karasu' },
    { ad: 'Akyazı' },
    { ad: 'Sapanca', mulhakat: 'Sakarya' },
    { ad: 'Pamukova', mulhakat: 'Geyve' },
    { ad: 'Taraklı', mulhakat: 'Geyve' },
    { ad: 'Kocaali', mulhakat: 'Karasu' },
    { ad: 'Kaynarca', mulhakat: 'Hendek' },
    { ad: 'Ferizli', mulhakat: 'Sakarya' },
    { ad: 'Söğütlü', mulhakat: 'Hendek' },
    { ad: 'Karapürçek', mulhakat: 'Sakarya' },
  ],

  /* ────────────────────────── 55 SAMSUN ────────────────────────── */
  'Samsun': [
    { ad: 'Samsun' },
    { ad: 'Bafra' },
    { ad: 'Çarşamba' },
    { ad: 'Terme' },
    { ad: 'Vezirköprü' },
    { ad: 'Havza' },
    { ad: 'Ladik', mulhakat: 'Havza' },
    { ad: 'Kavak', mulhakat: 'Samsun' },
    { ad: 'Alaçam', mulhakat: 'Bafra' },
    { ad: 'Tekkeköy', mulhakat: 'Samsun' },
    { ad: 'Ayvacık (Samsun)', mulhakat: 'Vezirköprü' },
    { ad: 'Asarcık', mulhakat: 'Samsun' },
    { ad: 'Salıpazarı', mulhakat: 'Çarşamba' },
    { ad: 'Yakakent', mulhakat: 'Bafra' },
    { ad: 'Ondokuzmayıs', mulhakat: 'Bafra' },
    { ad: 'Canik', mulhakat: 'Samsun' },
  ],

  /* ────────────────────────── 56 SİİRT ────────────────────────── */
  'Siirt': [
    { ad: 'Siirt' },
    { ad: 'Kurtalan' },
    { ad: 'Baykan' },
    { ad: 'Eruh' },
    { ad: 'Pervari' },
    { ad: 'Şirvan' },
    { ad: 'Tillo', mulhakat: 'Siirt' },
  ],

  /* ────────────────────────── 57 SİNOP ────────────────────────── */
  'Sinop': [
    { ad: 'Sinop' },
    { ad: 'Boyabat' },
    { ad: 'Gerze' },
    { ad: 'Ayancık' },
    { ad: 'Türkeli', mulhakat: 'Ayancık' },
    { ad: 'Durağan' },
    { ad: 'Erfelek', mulhakat: 'Sinop' },
    { ad: 'Dikmen', mulhakat: 'Sinop' },
    { ad: 'Saraydüzü', mulhakat: 'Boyabat' },
  ],

  /* ────────────────────────── 58 SİVAS ────────────────────────── */
  'Sivas': [
    { ad: 'Sivas' },
    { ad: 'Şarkışla' },
    { ad: 'Zara' },
    { ad: 'Gemerek' },
    { ad: 'Suşehri' },
    { ad: 'Kangal' },
    { ad: 'Divriği' },
    { ad: 'Gürün' },
    { ad: 'Yıldızeli', mulhakat: 'Sivas' },
    { ad: 'Hafik', mulhakat: 'Sivas' },
    { ad: 'İmranlı', mulhakat: 'Suşehri' },
    { ad: 'Koyulhisar', mulhakat: 'Suşehri' },
    { ad: 'Akıncılar', mulhakat: 'Suşehri' },
    { ad: 'Doğanşar', mulhakat: 'Suşehri' },
    { ad: 'Gölova', mulhakat: 'Suşehri' },
    { ad: 'Ulaş', mulhakat: 'Kangal' },
    { ad: 'Altınyayla (Sivas)', mulhakat: 'Sivas' },
  ],

  /* ────────────────────────── 59 TEKİRDAĞ ────────────────────────── */
  'Tekirdağ': [
    { ad: 'Tekirdağ' },
    { ad: 'Çorlu' },
    { ad: 'Çerkezköy' },
    { ad: 'Hayrabolu' },
    { ad: 'Malkara' },
    { ad: 'Muratlı', mulhakat: 'Çorlu' },
    { ad: 'Şarköy' },
    { ad: 'Saray' },
    { ad: 'Marmaraereğlisi', mulhakat: 'Tekirdağ' },
    { ad: 'Kapaklı', mulhakat: 'Çerkezköy' },
    { ad: 'Ergene', mulhakat: 'Çorlu' },
  ],

  /* ────────────────────────── 60 TOKAT ────────────────────────── */
  'Tokat': [
    { ad: 'Tokat' },
    { ad: 'Erbaa' },
    { ad: 'Niksar' },
    { ad: 'Turhal' },
    { ad: 'Zile' },
    { ad: 'Reşadiye' },
    { ad: 'Almus', mulhakat: 'Tokat' },
    { ad: 'Artova', mulhakat: 'Tokat' },
    { ad: 'Başçiftlik', mulhakat: 'Niksar' },
    { ad: 'Pazar (Tokat)', mulhakat: 'Tokat' },
    { ad: 'Sulusaray', mulhakat: 'Tokat' },
    { ad: 'Yeşilyurt (Tokat)', mulhakat: 'Tokat' },
  ],

  /* ────────────────────────── 61 TRABZON ────────────────────────── */
  'Trabzon': [
    { ad: 'Trabzon' },
    { ad: 'Akçaabat' },
    { ad: 'Araklı' },
    { ad: 'Of' },
    { ad: 'Sürmene' },
    { ad: 'Vakfıkebir' },
    { ad: 'Maçka', mulhakat: 'Trabzon' },
    { ad: 'Tonya', mulhakat: 'Vakfıkebir' },
    { ad: 'Beşikdüzü', mulhakat: 'Vakfıkebir' },
    { ad: 'Çaykara', mulhakat: 'Of' },
    { ad: 'Şalpazarı', mulhakat: 'Vakfıkebir' },
    { ad: 'Yomra', mulhakat: 'Trabzon' },
    { ad: 'Arsin', mulhakat: 'Trabzon' },
    { ad: 'Düzköy', mulhakat: 'Trabzon' },
    { ad: 'Hayrat', mulhakat: 'Of' },
    { ad: 'Dernekpazarı', mulhakat: 'Of' },
    { ad: 'Köprübaşı (Trabzon)', mulhakat: 'Trabzon' },
    { ad: 'Çarşıbaşı', mulhakat: 'Vakfıkebir' },
  ],

  /* ────────────────────────── 62 TUNCELİ ────────────────────────── */
  'Tunceli': [
    { ad: 'Tunceli' },
    { ad: 'Çemişgezek' },
    { ad: 'Hozat' },
    { ad: 'Mazgirt' },
    { ad: 'Nazımiye', mulhakat: 'Tunceli' },
    { ad: 'Ovacık (Tunceli)' },
    { ad: 'Pertek' },
    { ad: 'Pülümür', mulhakat: 'Tunceli' },
  ],

  /* ────────────────────────── 63 ŞANLIURFA ────────────────────────── */
  'Şanlıurfa': [
    { ad: 'Şanlıurfa' },
    { ad: 'Siverek' },
    { ad: 'Viranşehir' },
    { ad: 'Birecik' },
    { ad: 'Suruç' },
    { ad: 'Akçakale' },
    { ad: 'Ceylanpınar' },
    { ad: 'Hilvan', mulhakat: 'Siverek' },
    { ad: 'Bozova', mulhakat: 'Şanlıurfa' },
    { ad: 'Halfeti', mulhakat: 'Birecik' },
    { ad: 'Harran', mulhakat: 'Akçakale' },
    { ad: 'Eyyübiye', mulhakat: 'Şanlıurfa' },
    { ad: 'Haliliye', mulhakat: 'Şanlıurfa' },
    { ad: 'Karaköprü', mulhakat: 'Şanlıurfa' },
  ],

  /* ────────────────────────── 64 UŞAK ────────────────────────── */
  'Uşak': [
    { ad: 'Uşak' },
    { ad: 'Banaz' },
    { ad: 'Eşme' },
    { ad: 'Sivaslı', mulhakat: 'Uşak' },
    { ad: 'Ulubey (Uşak)', mulhakat: 'Uşak' },
    { ad: 'Karahallı', mulhakat: 'Eşme' },
  ],

  /* ────────────────────────── 65 VAN ────────────────────────── */
  'Van': [
    { ad: 'Van' },
    { ad: 'Erciş' },
    { ad: 'Başkale' },
    { ad: 'Çatak' },
    { ad: 'Gevaş' },
    { ad: 'Gürpınar' },
    { ad: 'Muradiye' },
    { ad: 'Özalp' },
    { ad: 'Saray (Van)', mulhakat: 'Özalp' },
    { ad: 'Bahçesaray', mulhakat: 'Van' },
    { ad: 'Çaldıran', mulhakat: 'Muradiye' },
    { ad: 'Edremit (Van)', mulhakat: 'Van' },
    { ad: 'İpekyolu', mulhakat: 'Van' },
    { ad: 'Tuşba', mulhakat: 'Van' },
  ],

  /* ────────────────────────── 66 YOZGAT ────────────────────────── */
  'Yozgat': [
    { ad: 'Yozgat' },
    { ad: 'Akdağmadeni' },
    { ad: 'Boğazlıyan' },
    { ad: 'Sorgun' },
    { ad: 'Yerköy' },
    { ad: 'Sarıkaya' },
    { ad: 'Çekerek' },
    { ad: 'Şefaatli', mulhakat: 'Yerköy' },
    { ad: 'Aydıncık (Yozgat)', mulhakat: 'Sorgun' },
    { ad: 'Çandır', mulhakat: 'Yozgat' },
    { ad: 'Kadışehri', mulhakat: 'Çekerek' },
    { ad: 'Saraykent', mulhakat: 'Yozgat' },
    { ad: 'Yenifakılı', mulhakat: 'Boğazlıyan' },
  ],

  /* ────────────────────────── 67 ZONGULDAK ────────────────────────── */
  'Zonguldak': [
    { ad: 'Zonguldak' },
    { ad: 'Ereğli (Zonguldak)' },
    { ad: 'Çaycuma' },
    { ad: 'Devrek' },
    { ad: 'Alaplı', mulhakat: 'Ereğli (Zonguldak)' },
    { ad: 'Gökçebey', mulhakat: 'Çaycuma' },
    { ad: 'Kilimli', mulhakat: 'Zonguldak' },
    { ad: 'Kozlu', mulhakat: 'Zonguldak' },
  ],

  /* ────────────────────────── 68 AKSARAY ────────────────────────── */
  'Aksaray': [
    { ad: 'Aksaray' },
    { ad: 'Ortaköy (Aksaray)' },
    { ad: 'Eskil' },
    { ad: 'Güzelyurt', mulhakat: 'Aksaray' },
    { ad: 'Sarıyahşi', mulhakat: 'Aksaray' },
    { ad: 'Ağaçören', mulhakat: 'Aksaray' },
    { ad: 'Gülağaç', mulhakat: 'Aksaray' },
    { ad: 'Sultanhanı', mulhakat: 'Aksaray' },
  ],

  /* ────────────────────────── 69 BAYBURT ────────────────────────── */
  'Bayburt': [
    { ad: 'Bayburt' },
    { ad: 'Aydıntepe', mulhakat: 'Bayburt' },
    { ad: 'Demirözü', mulhakat: 'Bayburt' },
  ],

  /* ────────────────────────── 70 KARAMAN ────────────────────────── */
  'Karaman': [
    { ad: 'Karaman' },
    { ad: 'Ermenek' },
    { ad: 'Sarıveliler', mulhakat: 'Ermenek' },
    { ad: 'Ayrancı', mulhakat: 'Karaman' },
    { ad: 'Başyayla', mulhakat: 'Ermenek' },
    { ad: 'Kazımkarabekir', mulhakat: 'Karaman' },
  ],

  /* ────────────────────────── 71 KIRIKKALE ────────────────────────── */
  'Kırıkkale': [
    { ad: 'Kırıkkale' },
    { ad: 'Keskin' },
    { ad: 'Delice' },
    { ad: 'Sulakyurt', mulhakat: 'Kırıkkale' },
    { ad: 'Balışeyh', mulhakat: 'Kırıkkale' },
    { ad: 'Bahşili', mulhakat: 'Kırıkkale' },
    { ad: 'Çelebi', mulhakat: 'Kırıkkale' },
    { ad: 'Karakeçili', mulhakat: 'Kırıkkale' },
    { ad: 'Yahşihan', mulhakat: 'Kırıkkale' },
  ],

  /* ────────────────────────── 72 BATMAN ────────────────────────── */
  'Batman': [
    { ad: 'Batman' },
    { ad: 'Beşiri' },
    { ad: 'Gercüş' },
    { ad: 'Kozluk' },
    { ad: 'Sason' },
    { ad: 'Hasankeyf', mulhakat: 'Batman' },
  ],

  /* ────────────────────────── 73 ŞIRNAK ────────────────────────── */
  'Şırnak': [
    { ad: 'Şırnak' },
    { ad: 'Cizre' },
    { ad: 'Silopi' },
    { ad: 'İdil' },
    { ad: 'Beytüşşebap' },
    { ad: 'Uludere' },
    { ad: 'Güçlükonak', mulhakat: 'Şırnak' },
  ],

  /* ────────────────────────── 74 BARTIN ────────────────────────── */
  'Bartın': [
    { ad: 'Bartın' },
    { ad: 'Amasra', mulhakat: 'Bartın' },
    { ad: 'Kurucaşile', mulhakat: 'Bartın' },
    { ad: 'Ulus', mulhakat: 'Bartın' },
  ],

  /* ────────────────────────── 75 ARDAHAN ────────────────────────── */
  'Ardahan': [
    { ad: 'Ardahan' },
    { ad: 'Göle' },
    { ad: 'Çıldır' },
    { ad: 'Hanak', mulhakat: 'Ardahan' },
    { ad: 'Posof', mulhakat: 'Ardahan' },
    { ad: 'Damal', mulhakat: 'Ardahan' },
  ],

  /* ────────────────────────── 76 IĞDIR ────────────────────────── */
  'Iğdır': [
    { ad: 'Iğdır' },
    { ad: 'Aralık', mulhakat: 'Iğdır' },
    { ad: 'Tuzluca' },
    { ad: 'Karakoyunlu', mulhakat: 'Iğdır' },
  ],

  /* ────────────────────────── 77 YALOVA ────────────────────────── */
  'Yalova': [
    { ad: 'Yalova' },
    { ad: 'Altınova', mulhakat: 'Yalova' },
    { ad: 'Armutlu', mulhakat: 'Yalova' },
    { ad: 'Çiftlikköy', mulhakat: 'Yalova' },
    { ad: 'Çınarcık', mulhakat: 'Yalova' },
    { ad: 'Termal', mulhakat: 'Yalova' },
  ],

  /* ────────────────────────── 78 KARABÜK ────────────────────────── */
  'Karabük': [
    { ad: 'Karabük' },
    { ad: 'Safranbolu' },
    { ad: 'Eskipazar' },
    { ad: 'Yenice (Karabük)' },
    { ad: 'Eflani', mulhakat: 'Karabük' },
    { ad: 'Ovacık (Karabük)', mulhakat: 'Karabük' },
  ],

  /* ────────────────────────── 79 KİLİS ────────────────────────── */
  'Kilis': [
    { ad: 'Kilis' },
    { ad: 'Musabeyli', mulhakat: 'Kilis' },
    { ad: 'Elbeyli', mulhakat: 'Kilis' },
    { ad: 'Polateli', mulhakat: 'Kilis' },
  ],

  /* ────────────────────────── 80 OSMANİYE ────────────────────────── */
  'Osmaniye': [
    { ad: 'Osmaniye' },
    { ad: 'Kadirli' },
    { ad: 'Düziçi' },
    { ad: 'Bahçe', mulhakat: 'Osmaniye' },
    { ad: 'Hasanbeyli', mulhakat: 'Osmaniye' },
    { ad: 'Sumbas', mulhakat: 'Kadirli' },
    { ad: 'Toprakkale', mulhakat: 'Osmaniye' },
  ],

  /* ────────────────────────── 81 DÜZCE ────────────────────────── */
  'Düzce': [
    { ad: 'Düzce' },
    { ad: 'Akçakoca' },
    { ad: 'Cumayeri', mulhakat: 'Düzce' },
    { ad: 'Çilimli', mulhakat: 'Düzce' },
    { ad: 'Gölyaka', mulhakat: 'Düzce' },
    { ad: 'Gümüşova', mulhakat: 'Düzce' },
    { ad: 'Kaynaşlı', mulhakat: 'Düzce' },
    { ad: 'Yığılca', mulhakat: 'Düzce' },
  ],
};
