<?php
/**
 * Exchange Rates Routes
 */

function handleExchangeRates($db, $method, $id, $action) {
    requireAuth();

    if ($id === 'latest' && $method === 'GET') {
        getLatestRates($db);
        return;
    }

    if ($id === 'fetch-tcmb' && $method === 'POST') {
        fetchTCMBRates($db);
        return;
    }

    if ($id === 'fetch-gold' && $method === 'POST') {
        fetchGoldPrice($db);
        return;
    }

    switch ($method) {
        case 'GET':
            if ($id) {
                getExchangeRate($db, $id);
            } else {
                getExchangeRates($db);
            }
            break;

        case 'POST':
            createExchangeRate($db);
            break;

        case 'PUT':
            updateExchangeRate($db, $id);
            break;

        case 'DELETE':
            deleteExchangeRate($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getExchangeRates($db) {
    $stmt = $db->prepare("SELECT * FROM exchange_rates ORDER BY rate_date DESC, quote_currency ASC");
    $stmt->execute();
    jsonResponse($stmt->fetchAll());
}

function getLatestRates($db) {
    $stmt = $db->prepare("
        SELECT er1.* FROM exchange_rates er1
        INNER JOIN (
            SELECT quote_currency, MAX(rate_date) as max_date
            FROM exchange_rates
            GROUP BY quote_currency
        ) er2 ON er1.quote_currency = er2.quote_currency AND er1.rate_date = er2.max_date
    ");
    $stmt->execute();
    $rates = $stmt->fetchAll();

    $ratesMap = [];
    foreach ($rates as $rate) {
        $ratesMap[$rate['quote_currency']] = $rate;
    }

    jsonResponse($ratesMap);
}

function getExchangeRate($db, $id) {
    $stmt = $db->prepare("SELECT * FROM exchange_rates WHERE id = ?");
    $stmt->execute([$id]);
    $rate = $stmt->fetch();

    if (!$rate) {
        jsonResponse(['success' => false, 'message' => 'Kur bulunamadı'], 404);
        return;
    }

    jsonResponse($rate);
}

function createExchangeRate($db) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE rate = VALUES(rate), source = VALUES(source), created_at = NOW()
    ");

    $stmt->execute([
        $data['rate_date'],
        $data['base_currency'] ?? 'TRY',
        $data['quote_currency'],
        $data['rate'],
        $data['source'] ?? 'manual'
    ]);

    jsonResponse(['success' => true, 'message' => 'Kur kaydedildi', 'id' => (int)$db->lastInsertId()]);
}

function updateExchangeRate($db, $id) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        UPDATE exchange_rates SET rate_date = ?, base_currency = ?, quote_currency = ?, rate = ?, source = ?
        WHERE id = ?
    ");

    $stmt->execute([
        $data['rate_date'],
        $data['base_currency'] ?? 'TRY',
        $data['quote_currency'],
        $data['rate'],
        $data['source'] ?? 'manual',
        $id
    ]);

    jsonResponse(['success' => true, 'message' => 'Kur güncellendi']);
}

function deleteExchangeRate($db, $id) {
    $stmt = $db->prepare("DELETE FROM exchange_rates WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Kur silindi']);
}

function fetchTCMBRates($db) {
    $url = 'https://www.tcmb.gov.tr/kurlar/today.xml';
    $xml = @file_get_contents($url);

    if (!$xml) {
        jsonResponse(['success' => false, 'message' => 'TCMB kurları alınamadı']);
        return;
    }

    $rates = [];
    $today = date('Y-m-d');

    if (preg_match('/<Currency.*?Kod="USD".*?>[\s\S]*?<ForexSelling>([\d,]+)<\/ForexSelling>/i', $xml, $matches)) {
        $usdRate = (float)str_replace(',', '.', $matches[1]);
        $rates['USD'] = $usdRate;

        $db->prepare("
            INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
            VALUES (?, 'TRY', 'USD', ?, 'tcmb', NOW())
            ON DUPLICATE KEY UPDATE rate = VALUES(rate), source = 'tcmb', created_at = NOW()
        ")->execute([$today, $usdRate]);
    }

    if (preg_match('/<Currency.*?Kod="EUR".*?>[\s\S]*?<ForexSelling>([\d,]+)<\/ForexSelling>/i', $xml, $matches)) {
        $eurRate = (float)str_replace(',', '.', $matches[1]);
        $rates['EUR'] = $eurRate;

        $db->prepare("
            INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
            VALUES (?, 'TRY', 'EUR', ?, 'tcmb', NOW())
            ON DUPLICATE KEY UPDATE rate = VALUES(rate), source = 'tcmb', created_at = NOW()
        ")->execute([$today, $eurRate]);
    }

    jsonResponse(['success' => true, 'message' => 'TCMB kurları güncellendi', 'rates' => $rates]);
}

function fetchGoldPrice($db) {
    // Try to fetch gold price
    $url = 'https://www.altinkaynak.com/Doviz/Kur/XAU';
    $html = @file_get_contents($url);

    if (!$html) {
        jsonResponse(['success' => false, 'message' => 'Altın kuru alınamadı']);
        return;
    }

    if (preg_match('/data-last="([\d,.]+)"/i', $html, $matches)) {
        $rate = (float)str_replace(['.', ','], ['', '.'], $matches[1]);
        $today = date('Y-m-d');

        $db->prepare("
            INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
            VALUES (?, 'TRY', 'XAU', ?, 'kapali-carsi', NOW())
            ON DUPLICATE KEY UPDATE rate = VALUES(rate), source = 'kapali-carsi', created_at = NOW()
        ")->execute([$today, $rate]);

        jsonResponse(['success' => true, 'message' => 'Altın kuru güncellendi', 'rate' => $rate, 'date' => $today]);
    } else {
        jsonResponse(['success' => false, 'message' => 'Altın kuru alınamadı']);
    }
}
