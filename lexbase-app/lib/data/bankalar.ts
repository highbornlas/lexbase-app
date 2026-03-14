export interface BankaInfo {
  ad: string;
  ticariUnvan?: string;
  mersis?: string;
  swift?: string;
  kod?: string;
}

export const BANKALAR: BankaInfo[] = [
  // === KAMU BANKALARI ===
  { ad: 'Ziraat Bankası', ticariUnvan: 'T.C. Ziraat Bankası A.Ş.', mersis: '0235001139000015', swift: 'TCZBTR2A', kod: '0010' },
  { ad: 'Halkbank', ticariUnvan: 'Türkiye Halk Bankası A.Ş.', mersis: '0296003587000013', swift: 'TRHBTR2A', kod: '0012' },
  { ad: 'Vakıfbank', ticariUnvan: 'Türkiye Vakıflar Bankası T.A.O.', mersis: '0388001629000033', swift: 'TVBATR2A', kod: '0015' },
  { ad: 'İller Bankası', ticariUnvan: 'İller Bankası A.Ş.', mersis: '0750004265200028', kod: '0013' },

  // === ÖZEL BANKALAR ===
  { ad: 'İş Bankası', ticariUnvan: 'Türkiye İş Bankası A.Ş.', mersis: '0466000741000033', swift: 'ISBKTR2A', kod: '0064' },
  { ad: 'Garanti BBVA', ticariUnvan: 'Türkiye Garanti Bankası A.Ş.', mersis: '0879000105000036', swift: 'TGBATRIS', kod: '0062' },
  { ad: 'Yapı Kredi', ticariUnvan: 'Yapı ve Kredi Bankası A.Ş.', mersis: '0315001284000013', swift: 'YAPITRIS', kod: '0067' },
  { ad: 'Akbank', ticariUnvan: 'Akbank T.A.Ş.', mersis: '0387000107000038', swift: 'AKBKTRIS', kod: '0046' },
  { ad: 'Denizbank', ticariUnvan: 'DenizBank A.Ş.', mersis: '0246003052000098', swift: 'DENITRIS', kod: '0134' },
  { ad: 'QNB Finansbank', ticariUnvan: 'QNB Finansbank A.Ş.', mersis: '0879000102000081', swift: 'FABORTR2', kod: '0111' },
  { ad: 'TEB', ticariUnvan: 'Türk Ekonomi Bankası A.Ş.', mersis: '0879001142000036', swift: 'TEBUTRIS', kod: '0032' },
  { ad: 'Şekerbank', ticariUnvan: 'Şekerbank T.A.Ş.', mersis: '0879000452000017', swift: 'SABORTR2', kod: '0059' },
  { ad: 'ING Türkiye', ticariUnvan: 'ING Bank A.Ş.', mersis: '0879000108000085', swift: 'INGBTRIS', kod: '0099' },
  { ad: 'HSBC Türkiye', ticariUnvan: 'HSBC Bank A.Ş.', mersis: '0414003542000015', swift: 'HABORTR2', kod: '0123' },
  { ad: 'Fibabanka', ticariUnvan: 'Fibabanka A.Ş.', mersis: '0879001632000011', swift: 'FBHLTRIS', kod: '0103' },
  { ad: 'Anadolubank', ticariUnvan: 'Anadolubank A.Ş.', mersis: '0879000410000056', swift: 'ANDLTRIS', kod: '0135' },
  { ad: 'Alternatifbank', ticariUnvan: 'Alternatifbank A.Ş.', mersis: '0879000111200013', swift: 'COBATRIS', kod: '0124' },
  { ad: 'Burgan Bank', ticariUnvan: 'Burgan Bank A.Ş.', mersis: '0879000116000016', swift: 'TARISTRI', kod: '0125' },
  { ad: 'Citibank', ticariUnvan: 'Citibank A.Ş.', mersis: '0879000401000014', swift: 'CABORTR2', kod: '0092' },
  { ad: 'Turkish Bank', ticariUnvan: 'Turkish Bank A.Ş.', swift: 'TUBATRIS', kod: '0096' },
  { ad: 'Odeabank', ticariUnvan: 'Odeabank A.Ş.', mersis: '0879007251000012', swift: 'ODEATRIS', kod: '0146' },
  { ad: 'ICBC Turkey Bank', ticariUnvan: 'ICBC Turkey Bank A.Ş.', swift: 'ICBKTRIS', kod: '0208' },
  { ad: 'Pasha Yatırım Bankası', ticariUnvan: 'Pasha Yatırım Bankası A.Ş.', swift: 'PABORTR2', kod: '0210' },
  { ad: 'Bank of China Turkey', ticariUnvan: 'Bank of China Turkey A.Ş.', swift: 'BKCHTR2A', kod: '0218' },
  { ad: 'Rabobank', ticariUnvan: 'Rabobank A.Ş.', swift: 'RABOTRIS', kod: '0093' },
  { ad: 'Deutsche Bank', ticariUnvan: 'Deutsche Bank A.Ş.', swift: 'DEUTTRXX', kod: '0082' },
  { ad: 'Société Générale', ticariUnvan: 'Société Générale S.A.', swift: 'SGSBTR2X', kod: '0100' },
  { ad: 'JPMorgan Chase', ticariUnvan: 'JPMorgan Chase Bank N.A.', swift: 'CABORTR1', kod: '0091' },
  { ad: 'Habib Bank', ticariUnvan: 'Habib Bank Limited', swift: 'HABBTRIS', kod: '0145' },
  { ad: 'Intesa Sanpaolo', ticariUnvan: 'Intesa Sanpaolo S.p.A.', swift: 'ISABTR2A', kod: '0098' },

  // === KALKINMA VE YATIRIM BANKALARI ===
  { ad: 'Türkiye Kalkınma ve Yatırım Bankası', ticariUnvan: 'Türkiye Kalkınma ve Yatırım Bankası A.Ş.', mersis: '0879000100200035', swift: 'TKYBTR2A', kod: '0016' },
  { ad: 'Takasbank', ticariUnvan: 'İstanbul Takas ve Saklama Bankası A.Ş.', mersis: '0879000104000079', swift: 'TAKBTR2A', kod: '0022' },
  { ad: 'Türk Eximbank', ticariUnvan: 'Türkiye İhracat Kredi Bankası A.Ş.', mersis: '0879000100100018', swift: 'TEBUTR2A', kod: '0019' },
  { ad: 'Aktif Yatırım Bankası', ticariUnvan: 'Aktif Yatırım Bankası A.Ş.', mersis: '0879000154000019', swift: 'CAABORTR', kod: '0143' },
  { ad: 'GSD Yatırım Bankası', ticariUnvan: 'GSD Yatırım Bankası A.Ş.', swift: 'GSDITRIS', kod: '0137' },
  { ad: 'Diler Yatırım Bankası', ticariUnvan: 'Diler Yatırım Bankası A.Ş.', swift: 'DABATRIS', kod: '0138' },
  { ad: 'Nurol Yatırım Bankası', ticariUnvan: 'Nurol Yatırım Bankası A.Ş.', swift: 'NORATRIS', kod: '0141' },
  { ad: 'Merrill Lynch', ticariUnvan: 'Merrill Lynch Yatırım Bank A.Ş.', swift: 'MLYMTR2A', kod: '0142' },
  { ad: 'Standard Chartered', ticariUnvan: 'Standard Chartered Yatırım Bankası Türk A.Ş.', swift: 'SCBLTRIS', kod: '0121' },
  { ad: 'BankPozitif', ticariUnvan: 'BankPozitif Kredi ve Kalkınma Bankası A.Ş.', swift: 'BPOSTRIS', kod: '0139' },

  // === KATILIM BANKALARI ===
  { ad: 'Kuveyt Türk', ticariUnvan: 'Kuveyt Türk Katılım Bankası A.Ş.', mersis: '0879000111000014', swift: 'KTEFTRIS', kod: '0205' },
  { ad: 'Türkiye Finans', ticariUnvan: 'Türkiye Finans Katılım Bankası A.Ş.', mersis: '0879000110000054', swift: 'AFKBTRIS', kod: '0206' },
  { ad: 'Albaraka Türk', ticariUnvan: 'Albaraka Türk Katılım Bankası A.Ş.', mersis: '0879000117000036', swift: 'BTFHTRIS', kod: '0203' },
  { ad: 'Ziraat Katılım', ticariUnvan: 'Ziraat Katılım Bankası A.Ş.', mersis: '0015038218400018', swift: 'ZTKATR2A', kod: '0209' },
  { ad: 'Vakıf Katılım', ticariUnvan: 'Vakıf Katılım Bankası A.Ş.', mersis: '0015032487400015', swift: 'VAKFTR21', kod: '0210' },
  { ad: 'Emlak Katılım', ticariUnvan: 'Emlak Katılım Bankası A.Ş.', swift: 'EMKBTR2A', kod: '0212' },

  // === DİJİTAL / NEO BANKALAR ===
  { ad: 'Hayat Finans', ticariUnvan: 'Hayat Finans Katılım Bankası A.Ş.', kod: '0214' },
  { ad: 'N Kolay (İş Bankası)', ticariUnvan: 'Türkiye İş Bankası A.Ş. — N Kolay', kod: '0064' },
  { ad: 'Enpara (QNB Finansbank)', ticariUnvan: 'QNB Finansbank A.Ş. — Enpara.com', kod: '0111' },
  { ad: 'Papara', ticariUnvan: 'Papara Elektronik Para A.Ş.', kod: '0216' },
  { ad: 'Moka (İyzico)', ticariUnvan: 'İyzico Ödeme Hizmetleri A.Ş.' },
  { ad: 'Tosla (Akbank)', ticariUnvan: 'Akbank T.A.Ş. — Tosla', kod: '0046' },
  { ad: 'Param', ticariUnvan: 'Param Ödeme Hizmetleri A.Ş.' },
  { ad: 'Colendi', ticariUnvan: 'Colendi Teknoloji A.Ş.' },
  { ad: 'Sipay', ticariUnvan: 'Sipay Elektronik Para ve Ödeme Hizmetleri A.Ş.' },

  // === DİĞER ===
  { ad: 'PTT', ticariUnvan: 'PTT A.Ş. (Posta ve Telgraf Teşkilatı)', mersis: '0750004362400027', kod: '0017' },
];
