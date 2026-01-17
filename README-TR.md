# Şirket Finans Takip

Electron, React, TypeScript ve SQLite ile geliştirilmiş kapsamlı bir şirket finans yönetimi masaüstü uygulaması.

## Özellikler

### Ana Modüller

- **Kontrol Paneli (Dashboard)**: Aylık gelir/gider özeti, yaklaşan ödemeler, vadesi geçmiş taksitler ve aktif projeler ile anlık finansal görünüm
- **İşlemler**: KDV ve stopaj hesaplamaları ile tüm gelir ve gider işlemlerini takip edin
- **Borç & Alacak**: Otomatik taksit oluşturma özelliği ile borç ve alacakları yönetin
- **Projeler**: Aşama bazlı ödeme takvimleri ile sözleşme ve projeleri izleyin
- **Taraflar**: Müşteri, tedarikçi ve diğer iş ortağı kayıtlarını tutun
- **Ödemeler**: Çoklu ödeme yöntemi desteği ile eksiksiz ödeme geçmişi
- **Raporlar**: Özet, işlem, borç ve proje raporları oluşturun, CSV olarak dışa aktarın
- **Döviz Kurları**: TCMB entegrasyonu ile çoklu para birimi desteği (TRY, USD, EUR)

### Ek Özellikler

- **Çoklu Para Birimi Desteği**: Tüm işlemler TRY, USD ve EUR destekler, otomatik TRY dönüşümü yapılır
- **TCMB Entegrasyonu**: Türkiye Cumhuriyet Merkez Bankası'ndan canlı döviz kurları çekin
- **Rol Tabanlı Erişim**: Farklı yetki seviyelerine sahip Admin ve Personel rolleri
- **CSV Dışa Aktarım**: İşlemleri, borçları ve raporları CSV formatında dışa aktarın
- **Çevrimdışı Çalışma**: Tüm veriler yerel SQLite veritabanında saklanır
- **Çapraz Platform**: macOS, Windows ve Linux üzerinde çalışır

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Ön Yüz (Frontend)** | React 18, TypeScript, TailwindCSS |
| **Durum Yönetimi** | Zustand |
| **Yönlendirme** | React Router 6 |
| **Masaüstü Çerçevesi** | Electron 28 |
| **Veritabanı** | SQLite 3 (better-sqlite3) |
| **Derleme Aracı** | Vite 5 |
| **Paket Oluşturucu** | Electron Builder |

## Gereksinimler

- **Node.js**: v20 LTS (yerel modül uyumluluğu için gerekli)
- **npm**: v10 veya üzeri
- **nvm**: Node.js sürüm yönetimi için önerilir

## Kurulum

### 1. Depoyu Klonlayın

```bash
git clone https://github.com/kullaniciadi/sirket-finans-takip.git
cd sirket-finans-takip
```

### 2. Electron Desktop Dalına Geçin

```bash
git checkout electron-desktop
```

### 3. Node.js v20 Kurun (kurulu değilse)

```bash
nvm install 20
nvm use 20
```

### 4. Bağımlılıkları Yükleyin

```bash
npm install
```

### 5. Yerel Modülleri Electron için Yeniden Derleyin

```bash
npx @electron/rebuild
```

### 6. Geliştirme Sunucusunu Başlatın

```bash
npm run electron:dev
```

Uygulama, sıcak yenileme (hot-reload) etkinleştirilmiş olarak otomatik açılacaktır.

## Demo Giriş Bilgileri

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | admin@sirket.com | admin123 |
| Personel | personel@sirket.com | staff123 |

## Proje Yapısı

```
sirket-finans-takip/
├── electron/                     # Electron ana süreç
│   ├── main.ts                   # Uygulama girişi, pencere oluşturma, IPC işleyiciler
│   ├── preload.ts                # Context bridge, API sunumu
│   ├── database/
│   │   ├── connection.ts         # WAL modlu SQLite bağlantısı
│   │   ├── migrations.ts         # Veritabanı şeması (12 tablo)
│   │   └── seed.ts               # Demo veri ekleyici
│   └── services/                 # İş mantığı katmanı
│       ├── AuthService.ts        # Kimlik doğrulama ve kullanıcı yönetimi
│       ├── TransactionService.ts # Gelir/gider işlemleri
│       ├── DebtService.ts        # Borç ve taksit yönetimi
│       ├── ProjectService.ts     # Proje ve aşama takibi
│       ├── PartyService.ts       # Müşteri/tedarikçi yönetimi
│       ├── CategoryService.ts    # İşlem kategorileri
│       ├── PaymentService.ts     # Ödeme kayıtları
│       ├── ExchangeRateService.ts# Döviz kurları ve TCMB API
│       ├── CurrencyService.ts    # Para birimi dönüşüm araçları
│       ├── ReportService.ts      # Dashboard ve rapor oluşturma
│       └── FileService.ts        # Belge yönetimi
├── src/                          # React ön yüz
│   ├── main.tsx                  # React giriş noktası
│   ├── App.tsx                   # Yönlendirici yapılandırması
│   ├── global.d.ts               # Window.api tip tanımları
│   ├── components/
│   │   └── layout/
│   │       ├── MainLayout.tsx    # Korumalı düzen sarmalayıcı
│   │       ├── Sidebar.tsx       # Gezinme kenar çubuğu
│   │       └── Topbar.tsx        # Kullanıcı menülü üst başlık
│   ├── pages/                    # Sayfa bileşenleri
│   │   ├── Login.tsx             # Giriş sayfası
│   │   ├── Dashboard.tsx         # Kontrol paneli
│   │   ├── Transactions.tsx      # İşlemler
│   │   ├── Debts.tsx             # Borç/Alacak listesi
│   │   ├── DebtDetail.tsx        # Borç detayı ve taksitler
│   │   ├── Projects.tsx          # Projeler
│   │   ├── ProjectDetail.tsx     # Proje detayı ve aşamalar
│   │   ├── Parties.tsx           # Taraflar (müşteri/tedarikçi)
│   │   ├── Payments.tsx          # Ödemeler
│   │   ├── Categories.tsx        # Kategoriler (admin)
│   │   ├── ExchangeRates.tsx     # Döviz kurları (admin)
│   │   ├── Reports.tsx           # Raporlar
│   │   └── Users.tsx             # Kullanıcılar (admin)
│   ├── store/                    # Zustand depoları
│   │   ├── authStore.ts          # Kimlik doğrulama durumu
│   │   └── appStore.ts           # UI durumu (uyarılar, kenar çubuğu)
│   ├── types/
│   │   └── index.ts              # TypeScript arayüzleri
│   └── utils/
│       ├── currency.ts           # Para birimi biçimlendirme
│       ├── date.ts               # Tarih araçları
│       └── validation.ts         # Zod doğrulama şemaları
├── package.json
├── vite.config.ts                # Vite + Electron eklenti yapılandırması
├── tailwind.config.js
├── tsconfig.json
└── electron-builder.json         # Derleme yapılandırması
```

## Veritabanı Şeması

Uygulama aşağıdaki tablolarla SQLite kullanır:

### Kullanıcılar ve Kimlik Doğrulama
- **users**: Roller (admin/personel) ve durum ile kullanıcı hesapları

### İş Varlıkları
- **parties**: Müşteriler, tedarikçiler ve diğer iş ortakları
- **categories**: Gelir ve gider kategorileri (hiyerarşik)
- **projects**: Durum takibi ile sözleşmeler ve projeler
- **project_milestones**: Projeler için ödeme aşamaları

### Finansal Kayıtlar
- **transactions**: Vergi hesaplamaları ile tüm gelir ve gider kayıtları
- **debts**: Borçlar ve alacaklar
- **installments**: Borçlar için ödeme takvimleri
- **payments**: Taksitlere bağlı ödeme kayıtları

### Sistem Verileri
- **exchange_rates**: Döviz kurları (manuel veya TCMB)
- **audit_logs**: Uyumluluk için aktivite takibi

## Mimari

### IPC İletişimi

Uygulama, güvenli iletişim için Electron'un context isolation özelliğini kullanır:

```
┌─────────────────┐     IPC      ┌─────────────────┐     SQL      ┌──────────┐
│  React Ön Yüz   │ ◄──────────► │  Ana Süreç      │ ◄──────────► │  SQLite  │
│  (Renderer)     │   window.api │  (Servisler)    │              │          │
└─────────────────┘              └─────────────────┘              └──────────┘
```

1. React bileşenleri `window.api.metodAdi()` çağırır
2. Preload betiği çağrıyı `ipcRenderer.invoke()` ile iletir
3. Ana süreç işleyicisi servis metodunu çalıştırır
4. Servis SQLite'ı sorgular ve sonucu döndürür
5. Sonuç IPC üzerinden React'e geri akar

### Durum Yönetimi

- **AuthStore**: localStorage kalıcılığı ile kullanıcı kimlik doğrulama durumu
- **AppStore**: Kenar çubuğu geçişi ve uyarı bildirimleri dahil UI durumu

### Çoklu Para Birimi İşleme

Tüm parasal tutarlar orijinal para birimleri ile saklanır. TRY karşılıkları sorgu zamanında şu şekilde hesaplanır:

1. İşlem tarihi için döviz kuru
2. En son mevcut kura geri dönüş
3. Kur bulunamazsa 1:1 oranı (TRY için)

## Kullanılabilir Komutlar

```bash
# Geliştirme
npm run dev              # Sadece Vite dev sunucusunu başlat
npm run electron:dev     # Sıcak yenileme ile tam Electron uygulamasını başlat

# Üretim
npm run build            # Mevcut platform için derle
npm run electron:build   # npm run build için takma ad

# Araçlar
npm run preview          # Üretim derlemesini önizle
npm run lint             # ESLint çalıştır
npx tsc --noEmit         # Çıktı oluşturmadan tip kontrolü yap
```

## Üretim için Derleme

### macOS (DMG)

```bash
npm run build
# Çıktı: release/Sirket Finans Takip-{sürüm}.dmg
```

### Windows (NSIS Yükleyici)

```bash
npm run build
# Çıktı: release/Sirket Finans Takip Setup {sürüm}.exe
```

### Linux (AppImage)

```bash
npm run build
# Çıktı: release/Sirket Finans Takip-{sürüm}.AppImage
```

## Yapılandırma

### Veritabanı Konumu

SQLite veritabanı şu konumda saklanır:
- **macOS**: `~/Library/Application Support/sirket-finans-takip/sirket-finans.db`
- **Windows**: `%APPDATA%/sirket-finans-takip/sirket-finans.db`
- **Linux**: `~/.config/sirket-finans-takip/sirket-finans.db`

### Ortam Değişkenleri

Ortam değişkeni gerekmez. Tüm yapılandırma uygulamaya gömülüdür.

## API Referansı

Uygulama `window.api` üzerinden 100'den fazla IPC metodu sunar. Ana kategoriler:

### Kimlik Doğrulama
- `login(email, password)`: Kullanıcı kimlik doğrulama
- `logout()`: Oturumu sonlandır
- `getCurrentUser()`: Mevcut kullanıcı bilgisini al

### İşlemler
- `getTransactions(filtreler?)`: İşlemleri listele
- `createTransaction(veri)`: Yeni işlem oluştur
- `updateTransaction(id, veri)`: İşlemi güncelle
- `deleteTransaction(id)`: İşlemi sil
- `exportTransactions(filtreler?)`: CSV'ye dışa aktar

### Borçlar ve Taksitler
- `getDebts(filtreler?)`: Borç/alacakları listele
- `getDebt(id)`: Taksitlerle birlikte borcu al
- `createDebt(veri)`: Yeni borç oluştur
- `createInstallments(borcId, adet)`: Taksitleri oluştur
- `addInstallmentPayment(taksitId, veri)`: Ödeme kaydet

### Projeler
- `getProjects(filtreler?)`: Projeleri listele
- `getProject(id)`: Aşamalarla birlikte projeyi al
- `createProject(veri)`: Yeni proje oluştur
- `createMilestone(veri)`: Projeye aşama ekle

### Raporlar
- `getDashboardData()`: Dashboard istatistiklerini al
- `getReportSummary(filtreler?)`: Özet raporu al
- `getTransactionReport(filtreler?)`: İşlem raporu al
- `exportReport(tip, filtreler?)`: Raporu CSV'ye dışa aktar

## Sorun Giderme

### Yerel Modül Hataları

`better-sqlite3` modül sürümü uyumsuzluğu hatası görürseniz:

```bash
npx @electron/rebuild
```

### Node.js Sürüm Sorunları

Node.js v20 kullandığınızdan emin olun:

```bash
nvm use 20
node -v  # v20.x.x göstermeli
```

### Veritabanı Sıfırlama

Veritabanını sıfırlamak ve baştan başlamak için:

1. Uygulamayı kapatın
2. Veritabanı dosyasını silin (yukarıdaki Veritabanı Konumu'na bakın)
3. Uygulamayı yeniden başlatın (migrasyonlar ve seed otomatik çalışacaktır)

## Katkıda Bulunma

1. Depoyu fork edin
2. Özellik dalı oluşturun (`git checkout -b ozellik/harika-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Harika özellik ekle'`)
4. Dalı push edin (`git push origin ozellik/harika-ozellik`)
5. Pull Request açın

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - detaylar için [LICENSE](LICENSE) dosyasına bakın.

## Teşekkürler

- [Electron](https://www.electronjs.org/) - Masaüstü uygulama çerçevesi
- [React](https://reactjs.org/) - UI kütüphanesi
- [Vite](https://vitejs.dev/) - Derleme aracı
- [TailwindCSS](https://tailwindcss.com/) - CSS çerçevesi
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite bağlantıları
- [Zustand](https://github.com/pmndrs/zustand) - Durum yönetimi
- [TCMB](https://www.tcmb.gov.tr/) - Döviz kuru verileri

---

## Ekran Görüntüleri

### Giriş Ekranı
Kullanıcı adı ve şifre ile güvenli giriş yapın.

### Kontrol Paneli
- Aylık gelir ve gider özeti
- Net bakiye göstergesi
- Yaklaşan taksitler listesi
- Vadesi geçmiş ödemeler uyarısı
- Aktif projeler durumu
- Son işlemler

### İşlemler
- Gelir/gider filtreleme
- Taraf, kategori ve proje bazlı arama
- Tarih aralığı filtresi
- Para birimi filtresi
- CSV dışa aktarım
- KDV ve stopaj otomatik hesaplama

### Borç/Alacak Yönetimi
- Borç ve alacak ayrımı
- Otomatik taksit oluşturma
- Taksit bazlı ödeme takibi
- Vadesi geçmiş taksit uyarıları
- Kısmi ödeme desteği

### Proje Takibi
- Sözleşme tutarı takibi
- Aşama bazlı ödeme planı
- Tahsilat yüzdesi göstergesi
- Proje durumu yönetimi

### Döviz Kurları (Admin)
- Manuel kur girişi
- TCMB'den otomatik kur çekme
- Günlük kur geçmişi
- USD ve EUR desteği

### Kullanıcı Yönetimi (Admin)
- Kullanıcı ekleme/düzenleme/silme
- Rol atama (Admin/Personel)
- Aktif/Pasif durum yönetimi
- Son giriş takibi
