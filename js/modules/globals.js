// ================================================================
// EMD HUKUK — GLOBAL DEĞIŞKENLER
// js/modules/globals.js
// ================================================================

// ================================================================
// GLOBAL DEĞİŞKENLER
// ================================================================
let currentUser = null;
let currentBuroId = null;
let aktivPersonelId = null;
let personelModalMod = 'yeni';
let gorevOnayId = null;

// ================================================================
// STATE
// ================================================================
let state = {
  muvekkillar:[],
  davalar:[],
  icra:[],
  butce:[],
  etkinlikler:[],
  avanslar:[],
  belgeler:[],
  iletisimler:[],
  logs:[],
  karsiTaraflar:[],
  vekillar:[],
  danismanlik:[],
  arabuluculuk:[],
  sureler:[],
  faturalar:[],
  personel:[],    // {id,ad,rol,tel,email,tc,baroSicil,baslama,durum,notlar,hesap:{email,sifreHash},yetkiler:{...},olusturanId,olusturmaTarih}
  gorevler:[],    // {id,personelId,tur,baslik,aciklama,dosyaTur,dosyaId,sonTarih,oncelik,durum,olusturanId,olusturmaTarih,tamamlamaTarih,tamamlamaAciklama}
  aktiviteLog:[], // {id,kullaniciId,kullaniciAd,islem,detay,tarih,saat,module}
  ihtarnameler:[], // {id,no,yon,tur,muvId,karsiTaraf,konu,noterlik,yevmiyeNo,tarih,tebligDurum,tebligTarih,icindekiler,ilgiliTur,ilgiliDosyaId}
  todolar:[], // {id,baslik,aciklama,oncelik,durum,atananId,olusturanId,dosyaTur,dosyaId,muvId,sonTarih,tamamlanmaTarih}
  finansIslemler:[], // Birleşik işlem defteri — finans_islemler tablosu
  ucretAnlasmalari:[], // Dosya bazlı ücret sözleşmeleri — ucret_anlasmalari tablosu
  buroGiderleri:[], // Büro operasyonel giderleri: {id,tarih,kategori,tutar,aciklama,tekrar,kdvOran,kdvTutar}
};

let aktivMuvId=null, aktivDavaId=null, aktivIcraId=null;
let aktifSekme='dava'; // 'dava' or 'icra' – context for modals
let evrakSekme='dilekce'; // current tab for evrak modal
let belgeModalTur='diger';
let bgFileData=null, evFileData=[];
let notModalCtx={}; // {type:'dava'|'icra', id}
let anlasmaCtx={};

// ================================================================
// TÜRKİYE İL-ADLİYE VERİSİ
// ================================================================
const IL_ADLIYELER={
"Adana":["Adana Adliyesi","Ceyhan Adliyesi","Karaisalı Adliyesi","Karataş Adliyesi","Kozan Adliyesi","Aladağ Adliyesi","Feke Adliyesi","İmamoğlu Adliyesi","Tufanbeyli Adliyesi","Yumurtalık Adliyesi","Pozantı Adliyesi"],
"Adıyaman":["Adıyaman Adliyesi","Besni Adliyesi","Gerger Adliyesi","Gölbaşı Adliyesi","Kâhta Adliyesi"],
"Afyonkarahisar":["Afyonkarahisar Adliyesi","Bolvadin Adliyesi","Çay Adliyesi","Dinar Adliyesi","Dazkırı Adliyesi","Emirdağ Adliyesi","İscehisar Adliyesi","Sandıklı Adliyesi","Sinanpaşa Adliyesi","Şuhut Adliyesi"],
"Ağrı":["Ağrı Adliyesi","Diyadin Adliyesi","Doğubayazıt Adliyesi","Eleşkirt Adliyesi","Taşlıçay Adliyesi"],
"Aksaray":["Aksaray Adliyesi","Eskil Adliyesi","Ortaköy Adliyesi","Şereflikoçhisar Adliyesi"],
"Amasya":["Amasya Adliyesi","Gümüşhacıköy Adliyesi","Merzifon Adliyesi","Suluova Adliyesi","Taşova Adliyesi"],
"Ankara":["Ankara Adliyesi","Ankara Batı Adliyesi","Akyurt Adliyesi","Balâ Adliyesi","Beypazarı Adliyesi","Çubuk Adliyesi","Elmadağ Adliyesi","Gölbaşı Adliyesi","Haymana Adliyesi","Kahramankazan Adliyesi","Kalecik Adliyesi","Kızılcahamam Adliyesi","Nallıhan Adliyesi","Polatlı Adliyesi","Şereflikoçhisar Adliyesi"],
"Antalya":["Antalya Adliyesi","Alanya Adliyesi","Akseki Adliyesi","Demre Adliyesi","Elmalı Adliyesi","Finike Adliyesi","Gazipaşa Adliyesi","Gündoğmuş Adliyesi","Kaş Adliyesi","Kemer Adliyesi","Korkuteli Adliyesi","Kumluca Adliyesi","Manavgat Adliyesi","Serik Adliyesi"],
"Ardahan":["Ardahan Adliyesi","Göle Adliyesi","Hanak Adliyesi","Posof Adliyesi"],
"Artvin":["Artvin Adliyesi","Arhavi Adliyesi","Borçka Adliyesi","Hopa Adliyesi","Şavşat Adliyesi","Yusufeli Adliyesi"],
"Aydın":["Aydın Adliyesi","Çine Adliyesi","Didim Adliyesi","Germencik Adliyesi","Kuşadası Adliyesi","Nazilli Adliyesi","Söke Adliyesi"],
"Balıkesir":["Balıkesir Adliyesi","Ayvalık Adliyesi","Bandırma Adliyesi","Bigadiç Adliyesi","Burhaniye Adliyesi","Dursunbey Adliyesi","Edremit Adliyesi","Erdek Adliyesi","Gönen Adliyesi","İvrindi Adliyesi","Kepsut Adliyesi","Manyas Adliyesi","Marmara Adliyesi","Savaştepe Adliyesi","Sındırgı Adliyesi","Susurluk Adliyesi"],
"Bartın":["Bartın Adliyesi","Amasra Adliyesi","Ulus Adliyesi"],
"Batman":["Batman Adliyesi","Kozluk Adliyesi","Sason Adliyesi"],
"Bayburt":["Bayburt Adliyesi"],
"Bilecik":["Bilecik Adliyesi","Bozüyük Adliyesi","Gölpazarı Adliyesi","Osmaneli Adliyesi","Söğüt Adliyesi"],
"Bingöl":["Bingöl Adliyesi","Genç Adliyesi","Karlıova Adliyesi","Kiğı Adliyesi","Solhan Adliyesi"],
"Bitlis":["Bitlis Adliyesi","Adilcevaz Adliyesi","Ahlat Adliyesi","Güroymak Adliyesi","Hizan Adliyesi","Mutki Adliyesi","Tatvan Adliyesi"],
"Bolu":["Bolu Adliyesi","Gerede Adliyesi","Göynük Adliyesi","Mengen Adliyesi","Mudurnu Adliyesi"],
"Burdur":["Burdur Adliyesi","Bucak Adliyesi","Gölhisar Adliyesi","Tefenni Adliyesi","Yeşilova Adliyesi"],
"Bursa":["Bursa Adliyesi","Gemlik Adliyesi","İnegöl Adliyesi","İznik Adliyesi","Yenişehir Adliyesi","Karacabey Adliyesi","Keles Adliyesi","Mudanya Adliyesi","Mustafakemalpaşa Adliyesi","Orhaneli Adliyesi","Orhangazi Adliyesi"],
"Çanakkale":["Çanakkale Adliyesi","Ayvacık Adliyesi","Bayramiç Adliyesi","Biga Adliyesi","Çan Adliyesi","Ezine Adliyesi","Gelibolu Adliyesi","Gökçeada Adliyesi","Lâpseki Adliyesi","Yenice Adliyesi"],
"Çankırı":["Çankırı Adliyesi","Çerkeş Adliyesi","Ilgaz Adliyesi","Kurşunlu Adliyesi","Şabanözü Adliyesi"],
"Çorum":["Çorum Adliyesi","Bayat Adliyesi","İskilip Adliyesi","Kargı Adliyesi","Osmancık Adliyesi","Sungurlu Adliyesi"],
"Denizli":["Denizli Adliyesi","Acıpayam Adliyesi","Buldan Adliyesi","Çal Adliyesi","Çameli Adliyesi","Çardak Adliyesi","Çivril Adliyesi","Kale Adliyesi","Sarayköy Adliyesi","Tavas Adliyesi"],
"Diyarbakır":["Diyarbakır Adliyesi","Bismil Adliyesi","Çermik Adliyesi","Çınar Adliyesi","Çüngüş Adliyesi","Dicle Adliyesi","Eğil Adliyesi","Ergani Adliyesi","Hani Adliyesi","Hazro Adliyesi","Kulp Adliyesi","Lice Adliyesi","Silvan Adliyesi"],
"Düzce":["Düzce Adliyesi","Akçakoca Adliyesi","Yığılca Adliyesi"],
"Edirne":["Edirne Adliyesi","Enez Adliyesi","İpsala Adliyesi","Keşan Adliyesi","Uzunköprü Adliyesi"],
"Elazığ":["Elazığ Adliyesi","Karakoçan Adliyesi","Keban Adliyesi","Kovancılar Adliyesi","Maden Adliyesi","Palu Adliyesi"],
"Erzincan":["Erzincan Adliyesi","Çayırlı Adliyesi","İliç Adliyesi","Kemah Adliyesi","Kemaliye Adliyesi","Refahiye Adliyesi","Tercan Adliyesi"],
"Erzurum":["Erzurum Adliyesi","Aşkale Adliyesi","Çat Adliyesi","Hınıs Adliyesi","Horasan Adliyesi","İspir Adliyesi","Karayazı Adliyesi","Pasinler Adliyesi","Tekman Adliyesi","Tortum Adliyesi"],
"Eskişehir":["Eskişehir Adliyesi","Beylikova Adliyesi","Çifteler Adliyesi","Mihalıççık Adliyesi","Seyitgazi Adliyesi","Sivrihisar Adliyesi"],
"Gaziantep":["Gaziantep Adliyesi","Araban Adliyesi","İslahiye Adliyesi","Karkamış Adliyesi","Nizip Adliyesi","Nurdağı Adliyesi","Oğuzeli Adliyesi"],
"Giresun":["Giresun Adliyesi","Alucra Adliyesi","Bulancak Adliyesi","Dereli Adliyesi","Espiye Adliyesi","Görele Adliyesi","Şebinkarahisar Adliyesi","Tirebolu Adliyesi"],
"Gümüşhane":["Gümüşhane Adliyesi","Kelkit Adliyesi","Şiran Adliyesi","Torul Adliyesi"],
"Hakkâri":["Hakkâri Adliyesi","Çukurca Adliyesi","Şemdinli Adliyesi","Yüksekova Adliyesi"],
"Hatay":["Hatay Adliyesi","Altınözü Adliyesi","Dörtyol Adliyesi","Erzin Adliyesi","Hassa Adliyesi","İskenderun Adliyesi","Kırıkhan Adliyesi","Reyhanlı Adliyesi","Samandağ Adliyesi","Yayladağı Adliyesi"],
"Iğdır":["Iğdır Adliyesi","Aralık Adliyesi","Tuzluca Adliyesi"],
"Isparta":["Isparta Adliyesi","Eğirdir Adliyesi","Keçiborlu Adliyesi","Senirkent Adliyesi","Sütçüler Adliyesi","Şarkikaraağaç Adliyesi","Yalvaç Adliyesi"],
"İstanbul":["İstanbul Adliyesi (Çağlayan)","İstanbul Anadolu Adliyesi","Bakırköy Adliyesi","Büyükçekmece Adliyesi","Gaziosmanpaşa Adliyesi","Küçükçekmece Adliyesi","Silivri Adliyesi","Adalar Adliyesi","Beykoz Adliyesi","Şile Adliyesi"],
"İzmir":["İzmir Adliyesi","Aliağa Adliyesi","Bergama Adliyesi","Çeşme Adliyesi","Dikili Adliyesi","Foça Adliyesi","Karaburun Adliyesi","Karşıyaka Adliyesi","Kemalpaşa Adliyesi","Kınık Adliyesi","Kiraz Adliyesi","Menderes Adliyesi","Menemen Adliyesi","Ödemiş Adliyesi","Seferihisar Adliyesi","Selçuk Adliyesi","Tire Adliyesi","Torbalı Adliyesi","Urla Adliyesi"],
"Kahramanmaraş":["Kahramanmaraş Adliyesi","Afşin Adliyesi","Andırın Adliyesi","Elbistan Adliyesi","Göksun Adliyesi","Pazarcık Adliyesi","Türkoğlu Adliyesi"],
"Karabük":["Karabük Adliyesi","Çerkeş Adliyesi","Eskipazar Adliyesi","Safranbolu Adliyesi","Yenice Adliyesi"],
"Karaman":["Karaman Adliyesi","Ermenek Adliyesi","Sarıveliler Adliyesi"],
"Kars":["Kars Adliyesi","Arpaçay Adliyesi","Digor Adliyesi","Kağızman Adliyesi","Sarıkamış Adliyesi","Selim Adliyesi"],
"Kastamonu":["Kastamonu Adliyesi","Araç Adliyesi","Azdavay Adliyesi","Devrekâni Adliyesi","İnebolu Adliyesi","Cide Adliyesi","Küre Adliyesi","Taşköprü Adliyesi","Tosya Adliyesi"],
"Kayseri":["Kayseri Adliyesi","Bünyan Adliyesi","Develi Adliyesi","İncesu Adliyesi","Pınarbaşı Adliyesi","Sarıoğlan Adliyesi","Sarız Adliyesi","Tomarza Adliyesi","Yahyalı Adliyesi","Yeşilhisar Adliyesi"],
"Kırıkkale":["Kırıkkale Adliyesi","Delice Adliyesi","Keskin Adliyesi","Sulakyurt Adliyesi"],
"Kırklareli":["Kırklareli Adliyesi","Babaeski Adliyesi","Demirköy Adliyesi","Lüleburgaz Adliyesi","Pınarhisar Adliyesi","Vize Adliyesi"],
"Kırşehir":["Kırşehir Adliyesi","Kaman Adliyesi","Mucur Adliyesi"],
"Kilis":["Kilis Adliyesi"],
"Kocaeli":["Kocaeli Adliyesi","Gebze Adliyesi","Gölcük Adliyesi","Kandıra Adliyesi","Karamürsel Adliyesi","Körfez Adliyesi"],
"Konya":["Konya Adliyesi","Akşehir Adliyesi","Beyşehir Adliyesi","Bozkır Adliyesi","Cihanbeyli Adliyesi","Çumra Adliyesi","Doğanhisar Adliyesi","Ereğli Adliyesi","Hadim Adliyesi","Ilgın Adliyesi","Kadınhanı Adliyesi","Karapınar Adliyesi","Kulu Adliyesi","Sarayönü Adliyesi","Seydişehir Adliyesi","Yunak Adliyesi"],
"Kütahya":["Kütahya Adliyesi","Altıntaş Adliyesi","Emet Adliyesi","Gediz Adliyesi","Hisarcık Adliyesi","Simav Adliyesi","Tavşanlı Adliyesi"],
"Malatya":["Malatya Adliyesi","Akçadağ Adliyesi","Arapgir Adliyesi","Darende Adliyesi","Doğanşehir Adliyesi","Hekimhan Adliyesi","Pütürge Adliyesi"],
"Manisa":["Manisa Adliyesi","Akhisar Adliyesi","Alaşehir Adliyesi","Demirci Adliyesi","Gördes Adliyesi","Kırkağaç Adliyesi","Kula Adliyesi","Salihli Adliyesi","Sarıgöl Adliyesi","Selendi Adliyesi","Soma Adliyesi","Turgutlu Adliyesi"],
"Mardin":["Mardin Adliyesi","Derik Adliyesi","Kızıltepe Adliyesi","Mazıdağı Adliyesi","Midyat Adliyesi","Nusaybin Adliyesi","Ömerli Adliyesi","Savur Adliyesi"],
"Mersin":["Mersin Adliyesi","Anamur Adliyesi","Bozyazı Adliyesi","Erdemli Adliyesi","Mut Adliyesi","Silifke Adliyesi","Tarsus Adliyesi"],
"Muğla":["Muğla Adliyesi","Bodrum Adliyesi","Datça Adliyesi","Fethiye Adliyesi","Köyceğiz Adliyesi","Marmaris Adliyesi","Milas Adliyesi","Ortaca Adliyesi","Ula Adliyesi","Yatağan Adliyesi"],
"Muş":["Muş Adliyesi","Bulanık Adliyesi","Malazgirt Adliyesi","Varto Adliyesi"],
"Nevşehir":["Nevşehir Adliyesi","Avanos Adliyesi","Derinkuyu Adliyesi","Gülşehir Adliyesi","Hacıbektaş Adliyesi","Kozaklı Adliyesi","Ürgüp Adliyesi"],
"Niğde":["Niğde Adliyesi","Altunhisar Adliyesi","Bor Adliyesi","Çamardı Adliyesi","Ulukışla Adliyesi"],
"Ordu":["Ordu Adliyesi","Akkuş Adliyesi","Fatsa Adliyesi","Korgan Adliyesi","Kumru Adliyesi","Mesudiye Adliyesi","Perşembe Adliyesi","Ulubey Adliyesi","Ünye Adliyesi"],
"Osmaniye":["Osmaniye Adliyesi","Bahçe Adliyesi","Düziçi Adliyesi","Kadirli Adliyesi","Toprakkale Adliyesi"],
"Rize":["Rize Adliyesi","Ardeşen Adliyesi","Çayeli Adliyesi","Fındıklı Adliyesi","İkizdere Adliyesi","Kalkandere Adliyesi","Pazar Adliyesi"],
"Sakarya":["Sakarya Adliyesi","Akyazı Adliyesi","Geyve Adliyesi","Hendek Adliyesi","Karasu Adliyesi","Pamukova Adliyesi","Sapanca Adliyesi"],
"Samsun":["Samsun Adliyesi","Alaçam Adliyesi","Atakum Adliyesi","Bafra Adliyesi","Canik Adliyesi","Çarşamba Adliyesi","Havza Adliyesi","İlkadım Adliyesi","Kavak Adliyesi","Ladik Adliyesi","Ondokuzmayıs Adliyesi","Tekkeköy Adliyesi","Terme Adliyesi","Vezirköprü Adliyesi"],
"Siirt":["Siirt Adliyesi","Baykan Adliyesi","Eruh Adliyesi","Kurtalan Adliyesi","Pervari Adliyesi","Şirvan Adliyesi"],
"Sinop":["Sinop Adliyesi","Ayancık Adliyesi","Boyabat Adliyesi","Durağan Adliyesi","Gerze Adliyesi","Türkeli Adliyesi"],
"Sivas":["Sivas Adliyesi","Divriği Adliyesi","Gemerek Adliyesi","Gürün Adliyesi","Hafik Adliyesi","Kangal Adliyesi","Koyulhisar Adliyesi","Şarkışla Adliyesi","Suşehri Adliyesi","Yıldızeli Adliyesi","Zara Adliyesi"],
"Şanlıurfa":["Şanlıurfa Adliyesi","Akçakale Adliyesi","Birecik Adliyesi","Bozova Adliyesi","Ceylanpınar Adliyesi","Halfeti Adliyesi","Harran Adliyesi","Hilvan Adliyesi","Siverek Adliyesi","Suruç Adliyesi","Viranşehir Adliyesi"],
"Şırnak":["Şırnak Adliyesi","Beytüşşebap Adliyesi","Cizre Adliyesi","İdil Adliyesi","Silopi Adliyesi","Uludere Adliyesi"],
"Tekirdağ":["Tekirdağ Adliyesi","Çerkezköy Adliyesi","Çorlu Adliyesi","Hayrabolu Adliyesi","Malkara Adliyesi","Muratlı Adliyesi","Saray Adliyesi","Şarköy Adliyesi","Süleymanpaşa Adliyesi"],
"Tokat":["Tokat Adliyesi","Artova Adliyesi","Erbaa Adliyesi","Niksar Adliyesi","Reşadiye Adliyesi","Turhal Adliyesi","Zile Adliyesi"],
"Trabzon":["Trabzon Adliyesi","Akçaabat Adliyesi","Araklı Adliyesi","Arsin Adliyesi","Çaykara Adliyesi","Hayrat Adliyesi","Köprübaşı Adliyesi","Maçka Adliyesi","Of Adliyesi","Sürmene Adliyesi","Şalpazarı Adliyesi","Tonya Adliyesi","Vakfıkebir Adliyesi","Yomra Adliyesi"],
"Tunceli":["Tunceli Adliyesi","Çemişgezek Adliyesi","Hozat Adliyesi","Mazgirt Adliyesi","Nazimiye Adliyesi","Ovacık Adliyesi","Pertek Adliyesi","Pülümür Adliyesi"],
"Uşak":["Uşak Adliyesi","Banaz Adliyesi","Eşme Adliyesi","Karahallı Adliyesi","Sivaslı Adliyesi","Ulubey Adliyesi"],
"Van":["Van Adliyesi","Bahçesaray Adliyesi","Başkale Adliyesi","Çatak Adliyesi","Çaldıran Adliyesi","Edremit Adliyesi","Erciş Adliyesi","Gevaş Adliyesi","Gürpınar Adliyesi","İpekyolu Adliyesi","Muradiye Adliyesi","Özalp Adliyesi","Saray Adliyesi","Tuşba Adliyesi"],
"Yalova":["Yalova Adliyesi","Altınova Adliyesi","Çınarcık Adliyesi","Termal Adliyesi"],
"Yozgat":["Yozgat Adliyesi","Akdağmadeni Adliyesi","Boğazlıyan Adliyesi","Çayıralan Adliyesi","Çekerek Adliyesi","Kadışehri Adliyesi","Sarıkaya Adliyesi","Sorgun Adliyesi","Şefaatli Adliyesi","Yerköy Adliyesi"],
"Zonguldak":["Zonguldak Adliyesi","Alaplı Adliyesi","Çaycuma Adliyesi","Devrek Adliyesi","Ereğli Adliyesi","Gökçebey Adliyesi"]
};
const ILLER=Object.keys(IL_ADLIYELER).sort(function(a,b){return a.localeCompare(b,'tr');});

function populateIlSelect(selId,curVal){
  var sel=document.getElementById(selId);if(!sel)return;
  sel.innerHTML='<option value="">— İl seçin —</option>';
  ILLER.forEach(function(il){sel.innerHTML+='<option value="'+il+'"'+(il===curVal?' selected':'')+'>'+il+'</option>';});
}
function populateAdliyeSelect(selId,il,curVal){
  var sel=document.getElementById(selId);if(!sel)return;
  var list=IL_ADLIYELER[il]||[];
  sel.innerHTML='<option value="">— Adliye seçin —</option>';
  list.forEach(function(a){sel.innerHTML+='<option value="'+a+'"'+(a===curVal?' selected':'')+'>'+a+'</option>';});
}
function ilSecDava(il){populateAdliyeSelect('d-adliye',il,'');}
function ilSecIcra(il){populateAdliyeSelect('i-adliye',il,'');}


function autoNo(tur) {
  const yil = new Date().getFullYear();
  let prefix, koleksiyon, alan;
  if (tur === 'dava')      { prefix = 'D'; koleksiyon = 'davalar'; alan = 'no'; }
  else if (tur === 'icra') { prefix = 'I'; koleksiyon = 'icra'; alan = 'no'; }
  else if (tur === 'ihtarname') { prefix = 'IHT'; koleksiyon = 'ihtarnameler'; alan = 'no'; }
  else if (tur === 'arabuluculuk') { prefix = 'AR'; koleksiyon = 'arabuluculuk'; alan = 'no'; }
  else return '';
  const arr = state[koleksiyon] || [];
  // Mevcut en yüksek numarayı bul
  let maks = 0;
  arr.forEach(x => {
    const no = x[alan] || '';
    const m = no.match(/(\d+)$/);
    if (m) { const n = parseInt(m[1]); if (n > maks) maks = n; }
  });
  const sira = String(maks + 1).padStart(3, '0');
  return `${prefix}-${yil}-${sira}`;
}

const SK='hukuk_buro_v3';
function nextSira(koleksiyon){
  const arr=state[koleksiyon]||[];
  return arr.length>0?Math.max(...arr.map(x=>x.sira||0))+1:1;
}

// ── Sort state ──────────────────────────────────────────────────
const sortState={
  muv:    {key:'sira',dir:1},
  kt:     {key:'sira',dir:1},
  vek:    {key:'sira',dir:1},
  dav:    {key:'sira',dir:1},
  icra:   {key:'sira',dir:1},
  iht:    {key:'tarih',dir:-1},
  arab:   {key:'basvuruTarih',dir:-1},
  dan:    {key:'tarih',dir:-1},
  todo:   {key:'sonTarih',dir:1},
};
function toggleSort(tablo,key){
  const s=sortState[tablo];
  if(s.key===key)s.dir*=-1; else{s.key=key;s.dir=1;}
  if(tablo==='muv')renderMuvekkillar(document.querySelector('#rehber-panel-muvekkillar .search-bar')?.value||'');
  else if(tablo==='kt')renderKarsiTaraflarListesi(document.getElementById('kt-ara-input')?.value||'');
  else if(tablo==='vek')renderVekillarListesi(document.getElementById('vek-ara-input')?.value||'');
  else if(tablo==='dav')ListeMotoru.render('davalar');
  else if(tablo==='icra')ListeMotoru.render('icra');
}
function sortArr(arr,tablo){
  const {key,dir}=sortState[tablo];
  return [...arr].sort((a,b)=>{
    let av=a[key]??'', bv=b[key]??'';
    if(typeof av==='number'||typeof bv==='number'){av=Number(av)||0;bv=Number(bv)||0;return dir*(av-bv);}
    return dir*String(av).localeCompare(String(bv),'tr',{numeric:true});
  });
}
function shIcon(tablo,key){
  const s=sortState[tablo];
  if(s.key!==key)return'<span class="arr">⇅</span>';
  return s.dir===1?'<span class="arr" style="opacity:1;color:var(--gold)">▲</span>':'<span class="arr" style="opacity:1;color:var(--gold)">▼</span>';
}
function shCls(tablo,key){return sortState[tablo].key===key?'sh active':'sh';}