# Plesk Panel Deploy Rehberi

## Ön Gereksinimler

- Plesk Panel erişimi
- PHP 8.1+ (Plesk'te aktif)
- MySQL/MariaDB veritabanı
- Domain veya subdomain

---

## Adım 1: Veritabanı Oluşturma

1. Plesk Panel → **Databases** → **Add Database**
2. Veritabanı adı, kullanıcı adı ve şifre belirleyin
3. **phpMyAdmin** açın
4. **Import** sekmesine gidin
5. `database.sql` dosyasını yükleyin ve çalıştırın
6. Tablolar oluşturulacak ve varsayılan admin kullanıcı eklenecek

> Varsayılan giriş: `admin@sirket.com` / `admin123`

---

## Adım 2: Dosyaları Yükleme

### Frontend Build

Bilgisayarınızda:

```bash
cd şirket-finans-takip
npm run web:build
```

### Dosya Yapısı Hazırlama

Plesk'e yüklenecek dosyalar:

```
ci4-api/
├── app/            ← PHP uygulama kodu
├── system/         ← SimpleRouter
├── vendor/         ← Composer bağımlılıkları
├── writable/       ← Log ve upload dizini
├── public/         ← Document Root (burası domain'e bağlanacak)
│   ├── index.php   ← Ana giriş noktası
│   ├── index.html  ← React SPA (dist-web'den kopyalanacak)
│   └── assets/     ← JS/CSS dosyaları (dist-web'den kopyalanacak)
└── .env            ← Ortam değişkenleri
```

### Yükleme Adımları

1. `dist-web/` içeriğini `ci4-api/public/` altına kopyalayın:
   ```bash
   cp -r dist-web/* ci4-api/public/
   ```

2. `env.production` dosyasını `.env` olarak kopyalayın ve düzenleyin:
   ```bash
   cp ci4-api/env.production ci4-api/.env
   ```
   Veritabanı bilgilerinizi ve domain adresinizi yazın.

3. `ci4-api/` klasörünün tamamını Plesk'e FTP veya File Manager ile yükleyin.

---

## Adım 3: Plesk Ayarları

### Document Root Ayarı

1. Plesk → **Websites & Domains** → Domain seçin
2. **Hosting & DNS** → **Hosting Settings**
3. **Document Root** alanını `ci4-api/public` olarak değiştirin

### PHP Ayarları

1. Plesk → Domain → **PHP Settings**
2. PHP versiyonu: **8.1** veya üzeri
3. Ayarlar:
   - `upload_max_filesize` = 10M
   - `post_max_size` = 12M
   - `max_execution_time` = 60
   - `memory_limit` = 256M

### .htaccess (Apache)

`ci4-api/public/.htaccess` dosyası oluşturun:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Static dosyaları doğrudan sun
    RewriteCond %{REQUEST_FILENAME} -f
    RewriteRule ^ - [L]

    # API isteklerini index.php'ye yönlendir
    RewriteCond %{REQUEST_URI} ^/api/
    RewriteRule ^(.*)$ index.php [QSA,L]

    # SPA: Diğer tüm istekleri index.html'e yönlendir
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [L]
</IfModule>
```

---

## Adım 4: Dizin İzinleri

Plesk File Manager veya SSH ile:

```bash
chmod -R 755 ci4-api/
chmod -R 777 ci4-api/writable/
```

---

## Adım 5: Test

1. `https://yourdomain.com/` → React SPA login sayfası gelmeli
2. `https://yourdomain.com/api/setup/check` → JSON yanıt dönmeli:
   ```json
   {"success":true,"message":"Kurulum durumu","tables_exist":true,"has_admin":true,...}
   ```
3. `admin@sirket.com` / `admin123` ile giriş yapın

---

## Adım 6: Veri Taşıma

1. Mevcut uygulamada **Admin Panel → Veritabanı → Export** ile verileri dışa aktarın
2. Plesk phpMyAdmin'den import edin

---

## Sorun Giderme

### API 500 Hatası
- `.env` dosyasındaki veritabanı bilgilerini kontrol edin
- `writable/` dizininin yazma izni olduğundan emin olun
- PHP hata loglarını kontrol edin: Plesk → Logs

### CORS Hatası
- `.env` dosyasındaki `CORS_ORIGIN` değerini domain adresinizle güncelleyin

### Frontend Yüklenmiyor
- `.htaccess` dosyasının doğru yerda olduğunu kontrol edin (`public/` içinde)
- `mod_rewrite` modülünün aktif olduğunu kontrol edin

### Dosya Yükleme Hatası
- PHP `upload_max_filesize` ve `post_max_size` ayarlarını kontrol edin
- `writable/uploads/` dizininin yazma izni olduğunu kontrol edin

---

## Güvenlik Kontrol Listesi

- [ ] `.env` dosyasındaki `JWT_SECRET` değerini güçlü bir şifreyle değiştirin
- [ ] `CI_ENVIRONMENT = production` olduğundan emin olun
- [ ] Varsayılan admin şifresini değiştirin
- [ ] `.env` dosyasının web'den erişilebilir olmadığını kontrol edin
- [ ] HTTPS aktif edin (Let's Encrypt ile ücretsiz)
