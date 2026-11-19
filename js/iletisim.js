// YON-067: mdSinyal destek iletişim bilgisi tek yerde. Uygulamadaki bütün ekranlar (geçersiz link, "Kurs hesabı nasıl açılır?", Destek, il taban listesi iletme,
// tanıtım sitesi formu) buradan okur. Statik site sayfaları (index, gizlilik, iletişim…) sinyal-kaynak/arac/site_uret.py'deki TEL, TEL_G ile üretilir; numara
// değişirse ikisi birlikte değiştirilir (aynı değer).
// DIG-032 destek düzeni (18 Kas kararı): uygulama içi destek talebi (Hesabım › mdSinyal Destek) + WhatsApp destek hattı, hafta içi 09:00–18:00;
// e-posta destek@mdsinyal.com. Site metinleri (iletişim, SSS) site_uret.py'deki DESTEK_SAAT, DESTEK_EPOSTA ile aynı tutulur.
export const DESTEK = { ad: 'Servet Sakar', tel: '905013636536', telGoster: '0501 363 65 36', saat: 'Hafta içi 09:00–18:00', eposta: 'destek@mdsinyal.com' };
export const destekWa = (metin = '') => 'https://wa.me/' + DESTEK.tel + (metin ? '?text=' + encodeURIComponent(metin) : '');
