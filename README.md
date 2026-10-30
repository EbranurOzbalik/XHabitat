# XHabitat 🌱

**Daha bilinçli üretim, daha yaşanabilir bir dünya.**

XHabitat, çimento üretiminde elektrik tüketimini ve enerji kaynaklı karbon salımını görünür hâle getiren bir web uygulamasıdır. Yeşil Gelecek Hackathonu için geliştirilen bu prototip; günlük üretim takibini, verimlilik analizini ve Cemendus senaryo modüllerini aynı çalışma alanında birleştirir.

> **Prototip kapsamı:** Günlük veriler kullanıcı tarafından girilir. Fabrika demosundaki sensörler sentetiktir; öneriler kural tabanlıdır. Gerçek IoT bağlantısı veya AI API entegrasyonu bulunmaz.

## Özellikler

| Ekran | Neler yapabilirsin? |
| --- | --- |
| Genel bakış | Son üretim gününü, elektrik yoğunluğunu, tahmini karbon salımını ve son 7 kaydı görüntüle. |
| Veri girişi | Tarih, üretim, elektrik, kömür ve çalışma süresi bilgilerini kaydet. |
| Enerji & karbon | Karbon grafiğini incele ve emisyon katsayılarını değiştir. |
| Tasarruf önerileri | Geçmiş kayıtlarla karşılaştırılan, kural tabanlı önerileri incele. |
| Fabrika demosu | Cemendus sensör simülasyonunu, örnek güç profilini ve eşik uyarılarını keşfet. |
| Senaryo analizi | Elektrik, yakıt, klinker ve üretim değişikliklerinin varsayımsal etkilerini karşılaştır. |

Ek olarak CSV dışa aktarımı, tarih bazlı kayıt güncelleme ve mobil ekranlara uyumlu bir arayüz sunar.

## Hızlı başlangıç

**Gereksinimler:** Node.js ve modern bir tarayıcı. Depoyu klonlamak için Git gerekir. Geliştirme sırasında Node.js 24 ile doğrulanmıştır.

```bash
git clone https://github.com/EbranurOzbalik/XHabitat.git
cd XHabitat
npm start
```

Uygulamayı [http://127.0.0.1:4173](http://127.0.0.1:4173) adresinde aç.

Proje zaten bilgisayarındaysa `package.json` dosyasının bulunduğu klasörde `npm start` çalıştırman yeterlidir. Paket kurulumu, derleme veya API anahtarı gerekmez. Sunucuyu durdurmak için terminalde `Ctrl+C` kullan.

Sunucu yalnızca yerel bilgisayardan erişilebilen `127.0.0.1` adresinde çalışır. GitHub deposunun public olması, web uygulamasının internette yayınlandığı anlamına gelmez.

## Kullanım

1. İlk açılışta 7 günlük örnek üretim verilerini incele.
2. **Günlük veri ekle** ile aynı güne ait üretim ve tüketim değerlerini gir.
3. Özet panelinde ton başına elektrik tüketimini ve karbon tahminini görüntüle.
4. **Enerji & karbon** ekranından uygun emisyon katsayılarını ayarla.
5. Kayıtlarını **CSV indir** düğmesiyle dışa aktar.
6. Günlük kayıtlarından bağımsız örnekler için **Fabrika demosu** ve **Senaryo analizi** ekranlarını kullan.

İlk gerçek kaydın örnek kayıtların yerini alır. Aynı tarihle yeni kayıt girmek o günü günceller. **Demoyu yeniden yükle**, onayından sonra mevcut kayıtları örnek verilerle değiştirir ve katsayıları başlangıç değerlerine döndürür.

## Hesaplama yaklaşımı

### Günlük üretim analizi

```text
Elektrik yoğunluğu (kWh/ton) = Elektrik tüketimi / Üretim miktarı

Saatlik üretim (ton/saat) = Üretim miktarı / Çalışma süresi

Enerji kaynaklı CO₂ (ton) =
  Elektrik (kWh) × Elektrik katsayısı (kg CO₂/kWh) / 1.000
  + Kömür (ton) × Kömür katsayısı (ton CO₂/ton)
```

Geçmiş karşılaştırmasında önceki kayıtların toplam elektriği, toplam üretimine bölünür. Böylece karşılaştırma üretim miktarıyla ağırlıklandırılır.

Başlangıç katsayıları elektrik için **0,45 kg CO₂/kWh**, kömür için **2,4 ton CO₂/ton** olarak tanımlanmış örnek değerlerdir. Belirli bir ülke, şebeke veya yakıt standardını temsil etmez. Gerçek değerlendirmelerde uygun ve doğrulanmış katsayılar kullanılmalıdır.

**Bu hesap toplam çimento karbon ayak izi değildir.** Kalsinasyon, taşıma ve diğer süreç emisyonlarını kapsamaz.

### Cemendus senaryo modeli

Cemendus GreenAI sensör ve simülasyon özellikleri XHabitat'ın mevcut arayüzüne uyarlanmıştır. Ayrı bir React veya Cloudflare kurulumu gerekmez.

Örnek tesis başlangıç değerleri:

| Parametre | Değer |
| --- | --- |
| Elektrik gücü | 13.775 kW |
| Üretim hızı | 145 ton/saat |
| Elektrik yoğunluğu | 95 kWh/ton |
| Karbon yoğunluğu | 620 kg CO₂/ton |
| Klinker oranı | %85 |
| Alternatif yakıt payı | %18 |

Model, örnek karbon yoğunluğunu **%60 proses, %30 yakıt ve %10 elektrik** bileşenlerine ayırır. Alternatif yakıtın eşdeğer ısı girdisinde %50 daha düşük doğrudan CO₂ ürettiğini varsayar. Bunlar doğrulanmış tesis parametreleri değil, senaryoyu açıklamak için kullanılan varsayımlardır.

- Elektrik ve üretim azaltımı, ton başına tüketimi birlikte etkiler.
- Alternatif yakıt artışı **yüzde puan**, klinker azaltımı **göreli yüzde** olarak girilir.
- Yıllık sonuçlarda kullanıcının belirlediği çalışma süresi ve elektrik fiyatı kullanılır.
- Yıllık karbon farkı, senaryonun üretim miktarında karşılaştırılır.
- Üretim azalırsa elektrik tüketimindeki düşüşün tamamı verimlilik kazancı olarak yorumlanamaz.
- Malzeme kalitesi, yatırım maliyeti ve alternatif yakıt maliyeti modellenmez.

Senaryo sonuçları günlük üretim kayıtlarını veya günlük karbon hesaplarını değiştirmez. Fabrika demosu görünür ve etkin olduğunda sentetik ölçümler 10 saniyede bir yenilenir; simülasyon duraklatılabilir.

## Teknoloji ve dosya yapısı

Arayüz HTML, CSS ve JavaScript ile; grafikler SVG ile hazırlanmıştır. Node.js yalnızca statik dosyaları sunar. Kayıtlar tarayıcının `localStorage` alanında tutulur.

```text
XHabitat/
├── index.html                 # Ana uygulama ekranları
├── style.css                  # Görsel tasarım ve duyarlı yerleşim
├── app.js                     # Kayıtlar, grafikler, hesaplamalar ve gezinme
├── cemendus-model.js          # Senaryo, sensör ve uyarı modeli
├── cemendus.js                # Cemendus ekranlarının entegrasyonu
├── cemendus-model.test.cjs     # Hesaplama modeli testleri
├── server.cjs                 # Yerel statik dosya sunucusu
├── package.json               # Çalıştırma ve kontrol komutları
└── README.md
```

Google Fonts erişilemezse sistem yazı tipleri kullanılır. Temel işlevler dış servis gerektirmez.

## Kontroller

```bash
# Ana uygulama ve sunucu sözdizimi kontrolü
npm run check

# Cemendus dosyalarının sözdizimi kontrolü
node --check cemendus.js
node --check cemendus-model.js

# Hesaplama modeli testleri
node cemendus-model.test.cjs
```

Model testleri başlangıç senaryosunu, elektrik azaltımını, üretim değişiminin etkisini, yıllık hesapları, geçersiz girdileri ve uyarı eşiklerini kontrol eder.

## Veri saklama

- Kayıtlar kullanılan tarayıcı ve site adresine özeldir; cihazlar arasında eşitlenmez.
- Tarayıcı verilerinin silinmesi kayıtları kaldırır. Önemli kayıtlar için CSV yedeği al.
- CSV çıktısı üretim verilerini, hesaplanan değerleri, katsayıları ve örnek/kullanıcı verisi ayrımını içerir.
- Bu sürümde kullanıcı hesabı veya sunucu veritabanı yoktur. CSV içe aktarımı Veri girişi ekranındadır.

## Birlikte geliştirme

Her commit tek bir anlamlı değişiklik içersin: hesaplama modeli, arayüz özelliği, hata düzeltmesi veya dokümantasyon gibi. Değişiklikleri ayrı bir dalda hazırlayıp kontrollerden sonra pull request açabilirsiniz.

```bash
git switch -c feat/ozellik-adi
# Değişiklikleri yap ve ilgili kontrolleri çalıştır.
git add <degistirilen-dosyalar>
git commit -m "feat: yeni ozelligi acikla"
git push -u origin feat/ozellik-adi
```

---

Yeşil Gelecek Hackathonu · XHabitat

## Zenodo açık veri ekranı

[WU Tongyuan, China Cement Industry Dataset (CCID), v1.1](https://doi.org/10.5281/zenodo.8083481), 26 Haziran 2023, CC BY 4.0.

`Energy statistics for China cement plants.xlsx` dosyasının `data` sayfasındaki 1.460 kaynak satırı yerel `data/zenodo.json` dosyasından gösterilir. 1.376 kayıtta sayısal çimento elektrik değeri bulunur. Belge yılları 2010–2020 arasındadır; 13 kaydın yılı eksiktir. Satır sayısı tekil tesis sayısı değildir.

Yıl, bölge, üretim türü ve tesis adı filtreleri ile 15 satırlık sayfalama bulunur. Kaynak değerler değiştirilmez, eksikler sıfır yapılmaz ve günlük kayıtlara aktarılmaz. Birim yorumu aynı yazarın [CCID enerji referans dosyasındaki](https://zenodo.org/records/6321438) `cement_(kWh/t_cement)` ve `clinker_(kWh/t_clinker)` başlıklarıyla desteklenmiştir; ana dosya başlıkları birimi açıkça yazmaz. Farklı süreçler ve belge yılları doğrudan bir verimlilik sıralaması sayılmamalıdır.

Dönüşümde seçili sütunlar alınmış, özgün tesis adları ve Excel satır numaraları korunmuştur. Bu veriyle günlük üretim, kömür veya toplam CO₂ uydurulmaz. Kaynak lisansı Zenodo API metadata kaydında `cc-by-4.0` olarak belirtilmiştir.

Veriyi yeniden oluşturmak için Python ve `openpyxl` ile:

```bash
python scripts/import-zenodo.py "Energy statistics for China cement plants.xlsx"
```

İçe aktarıcı kaynak MD5 değerini `aa3d3d467aabb2953e6bfede5f615491` ile doğrular. Uygulamanın normal çalışması için Python veya Excel dosyası gerekmez. Yerel JSON sayesinde sunumda Zenodo bağlantısına bağımlılık yoktur.

## Kayıt düzenleme ve silme

Üretim günlüğü tüm kayıtları listeler. Her satırdaki **Düzenle** düğmesi mevcut değerleri forma getirir; **Düzenlemekten vazgeç** kaydı değiştirmeden döner. Tarih değişikliği kaydı yeni tarihe taşır. Hedef tarihte kayıt varsa üzerine yazmadan önce onay istenir.

**Sil** seçilen tarih için onay ister. Son kayıt silindiğinde boş durum gösterilir ve sayfa yenilendiğinde demo otomatik geri gelmez. Silme geri alınamaz; gerektiğinde önceden CSV yedeği alın.

Kayıt yönetimi testleri: `node records.test.cjs`.

## CSV içe aktarma

**Veri girişi → CSV ile toplu kayıt ekle** bölümünden dosya seç. İlk 10 kayıt önizlenir; içe aktar düğmesine basmadan kayıtlar değişmez. Tek bir hatalı satır varsa dosyanın tamamı bekletilir ve satır numaralarıyla hata gösterilir.

Gerekli sütunlar: `tarih`, `uretim_ton`, `elektrik_kwh`, `komur_ton`, `saat`. Başlık sırası değişebilir. Tarih `YYYY-AA-GG` veya `GG.AA.YYYY` biçimindedir. UTF-8, noktalı virgül/virgül/sekme ayırıcıları, tırnaklı alanlar ve nokta/virgül ondalıkları desteklenir. Binlik ayırıcı kullanılmaz: `65000` yazılır. Virgülle ayrılan dosyada ondalık virgüllü alan tırnak içine alınır. Sınır: 5 MB ve 10.000 kayıt.

Varsayılan olarak aynı tarihli mevcut kayıt korunur. Güncelleme seçilirse üzerine yazılacak kayıt sayısıyla ek onay istenir. Dosyanın kendi içinde tekrarlanan tarihler hata sayılır. Tarayıcıya kayıt başarısızsa mevcut veriler değiştirilmez.

Dışa aktarılan CSV yeniden yüklenebilir. Hesaplanmış alanlar ve CSV içindeki katsayılar içe alınmaz; hesaplar uygulamanın mevcut katsayılarıyla yeniden yapılır. Türkçe Excel için dışa aktarımda UTF-8 BOM, noktalı virgül ve ondalık virgül kullanılır.

İndirilebilir şablondaki satırlar `veri_turu=demo` olarak işaretlidir. Kendi ölçümlerini eklerken bu sütunu `kullanici` yap veya kaldır. Örnek veriler mevcut kullanıcı kayıtlarına karıştırılmaz; şablon ile gerçek veriler aynı dosyada bulunamaz.

Test: `node csv-model.test.cjs`.
