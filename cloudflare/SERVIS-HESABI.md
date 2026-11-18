# Servis hesabı (UYG-012, MSJ-021)

Ofis bilgisayarı kapalıyken de iki iş sunucuda (Cloudflare worker `sinyal-wa`) yapılır:

1. **Öğrenci istekleri:** öğrenci uygulamasından gelen ders alma, ders iptali (24 saat kuralı), puan, ders defteri onayı/itirazı, evrak ve dekont yükleme, müsaitlik, çalışma verileri. 10 dakikadan uzun bekleyen istek işlenir; uygulamadaki denetimlerin aynısı uygulanır. Ek ders teklifine cevap ve gece kısıtlı öğrencinin akşam ders isteği ofise kalır.
2. **Hatırlatmalar:** yarınki direksiyon dersi (öğrenciye), yarınki program (öğretmene), doğum günü. Yalnız kursun kendi WhatsApp hattı bağlıysa, kural açıksa ve *Zamanlı mesajlar › Demo sınırı* kapalıysa. Uygulama açıksa önce o gönderir; aynı mesaj iki kez gitmez. 21:00–08:00 arası mesaj gitmez.

`FIREBASE_SA` tanımlı değilse bunların hiçbiri çalışmaz. Ücretsizdir (Firebase Spark planında kalınır).

## Kurulum

1. Firebase konsolu › Proje ayarları › **Hizmet hesapları** › *Yeni özel anahtar oluştur*. Bir JSON dosyası iner.
2. `arac/wa-yayin` klasöründe:
   ```
   npx wrangler secret put FIREBASE_SA < indirilen-dosya.json
   ```
   Sonra indirilen dosyayı silin (anahtar yalnız Cloudflare'de kalır; koda, depoya, e-postaya yazılmaz).
3. `wrangler.toml` içindeki `[triggers]` satırına 15 dakikalık tetiği ekleyin:
   ```toml
   [triggers]
   crons = ["0 4 * * *", "*/15 * * * *"]
   ```
   `*/` ile başlayan tetik yalnız bu işleri çalıştırır; `0 4 * * *` günlük işlerdir (hat sağlığı, mevzuat takibi).
4. `wrangler deploy`.

İsteğe bağlı düz değişkenler (Cloudflare paneli › Workers › sinyal-wa › Ayarlar › Değişkenler):

| Ad | Varsayılan | Ne işe yarar |
|---|---|---|
| `SERVIS_KURSLAR` | boş (bütün kurslar) | Virgülle kurs kimlikleri: önce tek kursta denemek için |
| `SERVIS_BEKLE_DK` | 10 | Kaç dakika bekleyen öğrenci isteği "ofis kapalı" sayılır |
| `SERVIS_ISTEK` | 45 | Bir çalıştırmadaki en çok dış istek (ücretsiz planda sınır 50; ücretli planda 900 yapılabilir) |
| `SERVIS_KURS` | 3 | Bir çalıştırmada en çok kaç kurs |
| `SERVIS_MESAJ` | 20 | Bir çalıştırmada kurs başına en çok kaç hatırlatma |

## Doğrulama

- Önce `SERVIS_KURSLAR` ile kendi deneme kursunuzu verin.
- Şimdi bir kez çalıştırma: `curl -X POST -H "Authorization: Bearer <SAHIP_ANAHTAR>" https://api.mdsinyal.com/servis/calistir`
- Son çalıştırmanın özeti: `curl -H "Authorization: Bearer <SAHIP_ANAHTAR>" https://api.mdsinyal.com/servis` → `kurulu: true`, `son.ogrenci.islenen`, `son.hatirlatma.gonderilen`, `son.hata`.
- Canlı günlük: `npx wrangler tail sinyal-wa` (hata olursa `konu: servis` satırı).
- Uygulamada: ofis kapalıyken öğrenci telefonundan ders alın; 10–25 dakika içinde öğrencinin ekranında "onay bekliyor" kalkar, ofis açılınca ders kayıtta ve işlem geçmişinde "Sunucu (ofis kapalıyken)" olarak görünür.

## Kapatma

- Geçici: `[triggers]` satırından `"*/15 * * * *"` çıkarıp `wrangler deploy`.
- Tamamen: `npx wrangler secret delete FIREBASE_SA`; ayrıca Google Cloud konsolu › IAM › Hizmet hesapları › anahtarı silin.
- Tek kurs: `SERVIS_KURSLAR`'a o kursu yazmayın (liste doluysa yalnız listedekiler çalışır).

## Bilinmesi gerekenler

- Servis hesabı Firestore kurallarına takılmaz; anahtar çok değerlidir. Daha dar yetki isterseniz Google Cloud IAM'de yalnız *Cloud Datastore User* rolü olan ayrı bir hizmet hesabı açıp onun anahtarını kullanın.
- Okuma maliyeti: bekleyen istek olan kurs için ~75 belge okuması; hatırlatma için hattı bağlı kurs başına günde iki kez ~130 okuma (Spark günlük 50.000 okuma).
- Ücretsiz planda Cron çalıştırması başına işlemci süresi kısadır; çok büyük kursta iş yarıda kalırsa bir sonraki çalıştırmada devam eder (yazımlar tek işlemde, yarım kayıt oluşmaz). Sık olursa Workers Paid (aylık 5 $) gerekir.
- Öğretmenin ekranı (ders listesi) ofis açılınca güncellenir; bu arada öğretmene WhatsApp bildirimi gider.
- Hat sağlığı (Meta jetonu `GET graph/{PHONE_ID}`) zaten günlük tetikte çalışıyor; sonucu `/saglik`'ta.
