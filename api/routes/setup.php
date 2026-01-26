<?php
/**
 * Setup Routes - Database Initialization and Seeding
 */

function handleSetup($db, $method, $action) {
    // Setup endpoints don't require auth initially
    switch ($action) {
        case 'check':
            checkSetup($db);
            break;

        case 'initialize':
            if ($method === 'POST') {
                initializeDatabase($db);
            } else {
                jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
            }
            break;

        case 'create-admin':
            if ($method === 'POST') {
                createAdminUser($db);
            } else {
                jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
            }
            break;

        case 'seed-categories':
            if ($method === 'POST') {
                requireAdmin();
                seedCategories($db);
            } else {
                jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
            }
            break;

        case 'seed-exchange-rates':
            if ($method === 'POST') {
                requireAdmin();
                seedExchangeRates($db);
            } else {
                jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
            }
            break;

        case 'seed-demo':
            if ($method === 'POST') {
                requireAdmin();
                seedDemoData($db);
            } else {
                jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
            }
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Endpoint bulunamadı'], 404);
    }
}

function checkSetup($db) {
    try {
        // Check if users table exists and has data
        $stmt = $db->query("SELECT COUNT(*) as count FROM users");
        $result = $stmt->fetch();
        $hasUsers = $result['count'] > 0;

        // Check if admin exists
        $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        $result = $stmt->fetch();
        $hasAdmin = $result['count'] > 0;

        // Check categories
        $stmt = $db->query("SELECT COUNT(*) as count FROM categories");
        $result = $stmt->fetch();
        $hasCategories = $result['count'] > 0;

        jsonResponse([
            'success' => true,
            'initialized' => $hasUsers,
            'hasAdmin' => $hasAdmin,
            'hasCategories' => $hasCategories
        ]);
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'initialized' => false,
            'message' => 'Veritabanı henüz hazır değil'
        ]);
    }
}

function initializeDatabase($db) {
    try {
        // Run migrations by reading schema.sql
        $schemaFile = __DIR__ . '/../database/schema.sql';
        if (file_exists($schemaFile)) {
            $sql = file_get_contents($schemaFile);
            $db->exec($sql);
        }

        jsonResponse(['success' => true, 'message' => 'Veritabanı başarıyla oluşturuldu']);
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'message' => 'Veritabanı oluşturulamadı: ' . $e->getMessage()]);
    }
}

function createAdminUser($db) {
    $data = getRequestBody();

    if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
        jsonResponse(['success' => false, 'message' => 'Ad, e-posta ve şifre gerekli']);
        return;
    }

    // Check if admin already exists
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    $stmt->execute();
    $result = $stmt->fetch();
    if ($result['count'] > 0) {
        jsonResponse(['success' => false, 'message' => 'Zaten bir admin kullanıcı mevcut']);
        return;
    }

    // Check if email exists
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$data['email']]);
    if ($stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Bu e-posta adresi zaten kullanımda']);
        return;
    }

    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

    $stmt = $db->prepare("
        INSERT INTO users (name, email, password, role, status, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', 'active', NOW(), NOW())
    ");
    $stmt->execute([
        $data['name'],
        $data['email'],
        $hashedPassword
    ]);

    jsonResponse(['success' => true, 'message' => 'Admin kullanıcı oluşturuldu', 'id' => (int)$db->lastInsertId()]);
}

function seedCategories($db) {
    // Check if categories already exist
    $stmt = $db->query("SELECT COUNT(*) as count FROM categories");
    $result = $stmt->fetch();
    if ($result['count'] > 0) {
        jsonResponse(['success' => false, 'message' => 'Kategoriler zaten mevcut']);
        return;
    }

    $categories = [
        // Income categories
        ['Satış Geliri', 'income'],
        ['Hizmet Geliri', 'income'],
        ['Faiz Geliri', 'income'],
        ['Diğer Gelirler', 'income'],
        // Expense categories
        ['Personel Gideri', 'expense'],
        ['Kira Gideri', 'expense'],
        ['Elektrik/Su/Doğalgaz', 'expense'],
        ['İletişim Gideri', 'expense'],
        ['Ofis Malzemeleri', 'expense'],
        ['Ulaşım Gideri', 'expense'],
        ['Pazarlama Gideri', 'expense'],
        ['Yazılım/Lisans', 'expense'],
        ['Diğer Giderler', 'expense']
    ];

    $stmt = $db->prepare("
        INSERT INTO categories (name, type, parent_id, is_active, created_at, updated_at)
        VALUES (?, ?, NULL, 1, NOW(), NOW())
    ");

    foreach ($categories as $cat) {
        $stmt->execute([$cat[0], $cat[1]]);
    }

    jsonResponse(['success' => true, 'message' => 'Kategoriler oluşturuldu', 'count' => count($categories)]);
}

function seedExchangeRates($db) {
    // Check if exchange rates already exist
    $stmt = $db->query("SELECT COUNT(*) as count FROM exchange_rates");
    $result = $stmt->fetch();
    if ($result['count'] > 0) {
        jsonResponse(['success' => false, 'message' => 'Döviz kurları zaten mevcut']);
        return;
    }

    $today = date('Y-m-d');
    $rates = [];

    for ($i = 0; $i < 7; $i++) {
        $date = date('Y-m-d', strtotime("-$i days"));

        // USD rate
        $usdRate = 35.50 + (mt_rand(0, 50) / 100);
        $stmt = $db->prepare("
            INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
            VALUES (?, 'TRY', 'USD', ?, 'tcmb', NOW())
            ON DUPLICATE KEY UPDATE rate = VALUES(rate)
        ");
        $stmt->execute([$date, $usdRate]);

        // EUR rate
        $eurRate = 38.50 + (mt_rand(0, 50) / 100);
        $stmt->execute([$date, $eurRate]);
        $stmt = $db->prepare("
            INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
            VALUES (?, 'TRY', 'EUR', ?, 'tcmb', NOW())
            ON DUPLICATE KEY UPDATE rate = VALUES(rate)
        ");
        $stmt->execute([$date, $eurRate]);
    }

    jsonResponse(['success' => true, 'message' => 'Döviz kurları oluşturuldu']);
}

function seedDemoData($db) {
    // Check if parties already exist
    $stmt = $db->query("SELECT COUNT(*) as count FROM parties");
    $result = $stmt->fetch();
    if ($result['count'] > 0) {
        jsonResponse(['success' => false, 'message' => 'Demo veriler zaten mevcut']);
        return;
    }

    // Seed parties
    $parties = [
        ['customer', 'ABC Teknoloji A.Ş.', '1234567890', '0212 123 45 67', 'info@abcteknoloji.com', 'İstanbul, Türkiye', 'Yazılım geliştirme müşterisi'],
        ['customer', 'XYZ Danışmanlık Ltd.', '9876543210', '0216 987 65 43', 'iletisim@xyzdanismanlik.com', 'Ankara, Türkiye', 'Danışmanlık hizmetleri'],
        ['vendor', 'Tech Solutions Inc.', '5555555555', '0312 555 55 55', 'contact@techsolutions.com', 'İzmir, Türkiye', 'Yazılım lisans tedarikçisi'],
        ['vendor', 'Ofis Malzemeleri A.Ş.', '6666666666', '0232 666 66 66', 'satis@ofismalz.com', 'Bursa, Türkiye', 'Ofis malzemeleri tedarikçisi'],
        ['other', 'Freelance Geliştirici', null, '0533 111 22 33', 'developer@email.com', null, 'Dış kaynak geliştirici']
    ];

    $stmt = $db->prepare("
        INSERT INTO parties (type, name, tax_no, phone, email, address, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    foreach ($parties as $party) {
        $stmt->execute($party);
    }

    // Seed projects
    $today = date('Y-m-d');
    $stmt = $db->prepare("
        INSERT INTO projects (party_id, title, contract_amount, currency, start_date, end_date, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    $stmt->execute([1, 'Web Uygulaması Geliştirme', 150000, 'TRY', date('Y-m-d', strtotime('-30 days')), date('Y-m-d', strtotime('+60 days')), 'active', 'E-ticaret web uygulaması']);
    $project1Id = $db->lastInsertId();

    $stmt->execute([2, 'Danışmanlık Projesi', 25000, 'USD', date('Y-m-d', strtotime('-60 days')), date('Y-m-d', strtotime('+30 days')), 'active', 'IT altyapı danışmanlığı']);
    $project2Id = $db->lastInsertId();

    // Seed some transactions
    $stmt = $db->prepare("
        INSERT INTO transactions (type, party_id, category_id, project_id, date, amount, currency, vat_rate, vat_amount, withholding_rate, withholding_amount, net_amount, description, ref_no, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    ");

    // Income
    $stmt->execute(['income', 1, 2, $project1Id, date('Y-m-d', strtotime('-25 days')), 30000, 'TRY', 20, 6000, 0, 0, 36000, 'Analiz teslimi için ödeme', 'INV-001']);
    $stmt->execute(['income', 2, 2, $project2Id, date('Y-m-d', strtotime('-40 days')), 10000, 'USD', 0, 0, 0, 0, 10000, 'İhtiyaç analizi ödemesi', 'INV-002']);

    // Expense
    $stmt->execute(['expense', null, 5, null, date('Y-m-d', strtotime('-20 days')), 25000, 'TRY', 0, 0, 0, 0, 25000, 'Ocak ayı maaşları', 'PAY-001']);
    $stmt->execute(['expense', null, 6, null, date('Y-m-d', strtotime('-18 days')), 8000, 'TRY', 20, 1600, 0, 0, 9600, 'Ofis kirası', 'RENT-001']);

    jsonResponse(['success' => true, 'message' => 'Demo veriler oluşturuldu']);
}
