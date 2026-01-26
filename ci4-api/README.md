# Şirket Finans Takip API - CodeIgniter 4

Bu dizin, Şirket Finans Takip uygulamasının CodeIgniter 4 tabanlı REST API'sini içerir.

## Kurulum

### 1. Composer ile Bağımlılıkları Yükle

```bash
cd ci4-api
composer install
```

### 2. Ortam Ayarları

`.env` dosyasını düzenleyin:

```env
# Veritabanı
database.default.hostname = localhost
database.default.database = sirket_finans
database.default.username = root
database.default.password = your_password

# JWT
JWT_SECRET = your-secure-secret-key

# CORS
CORS_ORIGIN = http://localhost:5174
```

### 3. Veritabanı Kurulumu

API üzerinden tabloları oluşturun:

```bash
# Setup kontrolü
curl http://localhost/ci4-api/public/api/setup/check

# Tabloları oluştur
curl -X POST http://localhost/ci4-api/public/api/setup/initialize

# Admin kullanıcı oluştur
curl -X POST http://localhost/ci4-api/public/api/setup/create-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sirket.com","password":"admin123","name":"Admin"}'

# Varsayılan kategorileri oluştur
curl -X POST http://localhost/ci4-api/public/api/setup/seed-categories

# Döviz kurlarını ekle
curl -X POST http://localhost/ci4-api/public/api/setup/seed-rates
```

### 4. Apache/Nginx Ayarları

Apache için `.htaccess` dosyası `public/` dizininde mevcuttur.

Nginx için örnek yapılandırma:

```nginx
location /ci4-api/public {
    try_files $uri $uri/ /ci4-api/public/index.php?$query_string;
}
```

## Dizin Yapısı

```
ci4-api/
├── app/
│   ├── Config/
│   │   ├── App.php          # Uygulama ayarları
│   │   ├── Database.php     # Veritabanı bağlantısı
│   │   ├── Routes.php       # API rotaları
│   │   ├── Filters.php      # Middleware tanımları
│   │   └── Services.php     # Servis tanımları
│   ├── Controllers/
│   │   ├── BaseController.php
│   │   ├── AuthController.php
│   │   ├── TransactionController.php
│   │   └── ... (18 controller)
│   ├── Filters/
│   │   ├── AuthFilter.php   # JWT doğrulama
│   │   ├── AdminFilter.php  # Admin kontrolü
│   │   └── CorsFilter.php   # CORS header'ları
│   ├── Models/
│   │   ├── UserModel.php
│   │   ├── TransactionModel.php
│   │   └── ... (13 model)
│   └── Libraries/
│       └── JwtHelper.php    # JWT işlemleri
├── writable/
│   ├── uploads/             # Yüklenen dosyalar
│   ├── backups/             # Veritabanı yedekleri
│   └── logs/                # Uygulama logları
├── public/
│   ├── index.php            # Giriş noktası
│   └── .htaccess            # Apache rewrite kuralları
├── .env                     # Ortam değişkenleri
└── composer.json
```

## API Endpoint'leri

### Authentication
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/login` | Kullanıcı girişi |
| POST | `/api/auth/logout` | Çıkış (token invalidate) |
| GET | `/api/auth/me` | Aktif kullanıcı bilgisi |

### Transactions (İşlemler)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/transactions` | Tüm işlemleri listele |
| GET | `/api/transactions/{id}` | İşlem detayı |
| POST | `/api/transactions` | Yeni işlem oluştur |
| PUT | `/api/transactions/{id}` | İşlem güncelle |
| DELETE | `/api/transactions/{id}` | İşlem sil |
| GET | `/api/transactions/unassigned` | Projesiz işlemler |
| POST | `/api/transactions/assign` | Projeye ata |
| GET | `/api/transactions/export/csv` | CSV dışa aktar |

### Debts (Borç/Alacak)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/debts` | Tüm borçları listele |
| GET | `/api/debts/{id}` | Borç detayı |
| POST | `/api/debts` | Yeni borç oluştur |
| PUT | `/api/debts/{id}` | Borç güncelle |
| DELETE | `/api/debts/{id}` | Borç sil |
| POST | `/api/debts/{id}/installments` | Taksit oluştur |

### Installments (Taksitler)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/installments/{id}` | Taksit detayı |
| PUT | `/api/installments/{id}` | Taksit güncelle |
| DELETE | `/api/installments/{id}` | Taksit sil |
| POST | `/api/installments/{id}/pay` | Taksit öde |

### Parties (Taraflar)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/parties` | Tüm tarafları listele |
| GET | `/api/parties/{id}` | Taraf detayı |
| POST | `/api/parties` | Yeni taraf oluştur |
| PUT | `/api/parties/{id}` | Taraf güncelle |
| DELETE | `/api/parties/{id}` | Taraf sil |
| POST | `/api/parties/merge` | Tarafları birleştir |

### Categories (Kategoriler)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/categories` | Tüm kategorileri listele |
| GET | `/api/categories/{id}` | Kategori detayı |
| POST | `/api/categories` | Yeni kategori oluştur |
| PUT | `/api/categories/{id}` | Kategori güncelle |
| DELETE | `/api/categories/{id}` | Kategori sil |
| POST | `/api/categories/merge` | Kategorileri birleştir |

### Projects (Projeler)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/projects` | Tüm projeleri listele |
| GET | `/api/projects/{id}` | Proje detayı |
| POST | `/api/projects` | Yeni proje oluştur |
| PUT | `/api/projects/{id}` | Proje güncelle |
| DELETE | `/api/projects/{id}` | Proje sil |
| GET | `/api/projects/incomplete-count` | Tamamlanmamış sayısı |

### Milestones (Kilometre Taşları)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/milestones/{id}` | Milestone detayı |
| POST | `/api/milestones` | Yeni milestone oluştur |
| PUT | `/api/milestones/{id}` | Milestone güncelle |
| DELETE | `/api/milestones/{id}` | Milestone sil |

### Grants (Hibeler)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/grants` | Tüm hibeleri listele |
| GET | `/api/grants/{id}` | Hibe detayı |
| POST | `/api/grants` | Yeni hibe oluştur |
| PUT | `/api/grants/{id}` | Hibe güncelle |
| DELETE | `/api/grants/{id}` | Hibe sil |
| POST | `/api/grants/calculate` | Hibe tutarı hesapla |
| GET | `/api/grants/totals` | Hibe toplamları |

### Exchange Rates (Döviz Kurları)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/exchange-rates` | Tüm kurları listele |
| GET | `/api/exchange-rates/latest` | Güncel kurlar |
| POST | `/api/exchange-rates` | Yeni kur ekle |
| PUT | `/api/exchange-rates/{id}` | Kur güncelle |
| DELETE | `/api/exchange-rates/{id}` | Kur sil |
| POST | `/api/exchange-rates/fetch-tcmb` | TCMB'den çek |
| POST | `/api/exchange-rates/fetch-gold` | Altın fiyatı çek |

### Users (Kullanıcılar) - Admin Only
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/users` | Tüm kullanıcıları listele |
| GET | `/api/users/{id}` | Kullanıcı detayı |
| POST | `/api/users` | Yeni kullanıcı oluştur |
| PUT | `/api/users/{id}` | Kullanıcı güncelle |
| DELETE | `/api/users/{id}` | Kullanıcı sil |

### Reports (Raporlar)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/reports/dashboard` | Dashboard verileri |
| GET | `/api/reports/summary` | Özet rapor |
| GET | `/api/reports/transactions` | İşlem raporu |
| GET | `/api/reports/debts` | Borç raporu |
| GET | `/api/reports/projects` | Proje raporu |
| GET | `/api/reports/export` | Rapor dışa aktar |

### Documents (Belgeler)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/documents` | Tüm belgeleri listele |
| GET | `/api/documents/{id}` | Belge detayı |
| POST | `/api/documents` | Belge yükle |
| DELETE | `/api/documents/{id}` | Belge sil |
| GET | `/api/documents/{id}/preview` | Belge önizleme |

### Database (Veritabanı) - Admin Only
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/database/stats` | İstatistikler |
| GET | `/api/database/export` | JSON dışa aktar |
| POST | `/api/database/backup` | Yedek oluştur |
| POST | `/api/database/restore` | Yedekten geri yükle |
| POST | `/api/database/clear` | Tüm veriyi sil |

## Kullanım Örnekleri

### Login
```bash
curl -X POST http://localhost/ci4-api/public/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sirket.com","password":"admin123"}'
```

### İşlem Listele (with token)
```bash
curl http://localhost/ci4-api/public/api/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Yeni İşlem Oluştur
```bash
curl -X POST http://localhost/ci4-api/public/api/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "income",
    "date": "2024-01-15",
    "amount": 1000,
    "currency": "TRY",
    "vat_rate": 20,
    "description": "Hizmet bedeli"
  }'
```

## Frontend Entegrasyonu

Frontend'de API URL'ini güncelleyin:

```typescript
// src/api/http-client.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/ci4-api/public/api'
```

Veya `.env` dosyasında:

```env
VITE_API_URL=http://localhost/ci4-api/public/api
```

## Sorun Giderme

### CORS Hataları
`.env` dosyasında `CORS_ORIGIN` ayarını kontrol edin.

### Veritabanı Bağlantısı
`.env` dosyasında veritabanı ayarlarını kontrol edin.

### 500 Hatası
`writable/logs/` dizinindeki log dosyalarını kontrol edin.

## Lisans

MIT
