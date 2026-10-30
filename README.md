# XHabitat

Yeşil Gelecek Hackathonu için çimento üretiminde enerji ve karbon takip web uygulaması.

## Çalıştırma

Node.js kurulu olmalıdır. Bu klasörde terminal açın:

```sh
npm start
```

Tarayıcı: http://127.0.0.1:4173

Kurulum veya API anahtarı gerekmez. `npm run check` JavaScript sözdizimini kontrol eder.

## Özellikler ve sınırlar

- Dört görünüm: genel bakış, veri girişi, enerji ve karbon, öneriler.
- Yerel tarayıcı kaydı, tarih bazlı güncelleme, CSV dışa aktarımı.
- İlk kullanıcı kaydı örnek verileri kaldırır. Demo yeniden yükleme onay ister.
- Elektrik yoğunluğu = kWh / üretim tonu. Geçmiş karşılaştırması üretim ağırlıklıdır.
- Enerji kaynaklı ton CO₂ = elektrik kWh × elektrik katsayısı / 1000 + kömür tonu × kömür katsayısı.
- Başlangıç emisyon katsayıları yalnızca örnektir; gerçek raporlama için doğrulanmış tesis/şebeke/yakıt katsayıları gerekir.
- Kalsinasyon ve diğer süreç emisyonları dahil değildir; toplam karbon ayak izi değildir.
- Öneriler kural tabanlıdır; AI API entegrasyonu yoktur.
- Veriler cihazlar arasında eşitlenmez. Tarayıcı verilerini silmek kayıtları kaldırır; CSV ile yedek alın.
- Google Fonts erişilemezse sistem fontu kullanılır. Diğer işlevler dış servis gerektirmez.
