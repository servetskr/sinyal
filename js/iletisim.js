// YON-067: mdSinyal destek iletişim bilgisi tek yerde. Uygulamadaki bütün ekranlar (geçersiz link, "Kurs hesabı nasıl açılır?", Destek, il taban listesi iletme,
// tanıtım sitesi formu) buradan okur. Statik site sayfaları (index, gizlilik, iletişim…) sinyal-kaynak/arac/site_uret.py'deki TEL, TEL_G ile üretilir; numara
// değişirse ikisi birlikte değiştirilir (aynı değer).
export const DESTEK = { ad: 'Servet Sakar', tel: '905013636536', telGoster: '0501 363 65 36' };
export const destekWa = (metin = '') => 'https://wa.me/' + DESTEK.tel + (metin ? '?text=' + encodeURIComponent(metin) : '');
