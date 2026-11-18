# Yerel OCR (KAY-033/034: kimlik kartının MRZ'si cihazda okunur)

`js/belgeoku.js` bu klasördeki dosyaları **yalnız kullanıcı "Belgeden oku"yu açıp bir görsel seçince** yükler.
Hiçbir dosya CDN'den gelmez; görüntü cihazdan çıkmaz. Servis çalışanı (sw.js) bu dosyaları ilk kullanımda önbelleğe alır.

| Dosya | Kaynak | Sürüm | Lisans |
|---|---|---|---|
| `tesseract.esm.min.js`, `worker.min.js` | npm `tesseract.js` — https://registry.npmjs.org/tesseract.js/-/tesseract.js-7.0.0.tgz (`dist/`) | 7.0.0 | Apache-2.0 (`LICENSE-tesseract.js.md`) |
| `tesseract-core-simd-lstm.js/.wasm`, `tesseract-core-lstm.js/.wasm` | npm `tesseract.js-core` — https://registry.npmjs.org/tesseract.js-core/-/tesseract.js-core-7.0.0.tgz | 7.0.0 | Apache-2.0 (`LICENSE-tesseract.js-core.txt`) |
| `ocrb_int.traineddata.gz` | GitHub `Shreeshrii/tessdata_ocrb`, `ocrb_int.traineddata` — https://raw.githubusercontent.com/Shreeshrii/tessdata_ocrb/9135a9e9db502db1b3e983da39bc21ba83bbab47/ocrb_int.traineddata (sha256 `814f0d86…4434ee`) | 15 Nis 2019 (commit 9135a9e); tessdata_best/eng'den MRZ için OCR-B yazı tipleriyle ince ayarlı, tamsayı (hızlı) model | Apache-2.0 (`LICENSE-tessdata_ocrb.txt`; depoya 14 Kas 2026'da sahibince eklendi, commit 0daabbe) |

Değişiklik: iki `.min.js` dosyasından yalnız `//# sourceMappingURL=` satırı çıkarıldı (harita dosyaları depoda yok); `ocrb_int.traineddata` `gzip -9` ile sıkıştırıldı (tesseract.js `.gz` açar). Başka değişiklik yok.
Genel İngilizce modeli (eng) MRZ'de zayıf: '<' dolgu dizilerini kısaltıyor, 1/I, 0/O karıştırıyor; MRZ'ye özel `ocrb_int` hem daha doğru hem daha küçük (1,3 MB).

Gömülü üçüncü taraf parçalar (worker.min.js içinde): buffer (MIT), ieee754 (BSD-3-Clause), regenerator-runtime (MIT), zlib.js (MIT).

Çekirdek seçimi `js/belgeoku.js`'te: tarayıcı WebAssembly SIMD destekliyorsa `tesseract-core-simd-lstm`, değilse `tesseract-core-lstm`.
`.wasm` dosyası işçinin (`worker.min.js`) yanında aranır; bu yüzden hepsi aynı klasörde durmalı.
