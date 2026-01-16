<?php

namespace App\Services;

use App\Models\ExchangeRateModel;

class TCMBService
{
    protected ExchangeRateModel $exchangeRateModel;

    /**
     * TCMB daily exchange rates XML URL
     */
    protected const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';

    /**
     * Currencies to fetch from TCMB
     */
    protected const CURRENCIES = ['USD', 'EUR'];

    public function __construct()
    {
        $this->exchangeRateModel = new ExchangeRateModel();
    }

    /**
     * Fetch today's rates from TCMB
     */
    public function fetchTodayRates(): array
    {
        $result = [
            'success' => false,
            'rates' => [],
            'date' => null,
            'message' => '',
        ];

        try {
            $xml = $this->fetchXML();

            if ($xml === null) {
                $result['message'] = 'TCMB verilerine ulaşılamadı.';
                return $result;
            }

            // Get date from XML
            $dateAttr = (string) $xml->attributes()['Date'];
            $date = $this->parseDate($dateAttr);

            if (!$date) {
                $result['message'] = 'Tarih bilgisi okunamadı.';
                return $result;
            }

            $result['date'] = $date;

            // Parse rates
            foreach ($xml->Currency as $currency) {
                $code = (string) $currency->attributes()['CurrencyCode'];

                if (in_array($code, self::CURRENCIES)) {
                    $forexSelling = (float) str_replace(',', '.', (string) $currency->ForexSelling);

                    if ($forexSelling > 0) {
                        $result['rates'][$code] = $forexSelling;

                        // Save to database
                        $this->exchangeRateModel->upsertRate($date, $code, $forexSelling, 'tcmb');
                    }
                }
            }

            $result['success'] = count($result['rates']) > 0;
            $result['message'] = $result['success']
                ? 'Kurlar başarıyla güncellendi.'
                : 'Kur bilgisi bulunamadı.';

        } catch (\Exception $e) {
            $result['message'] = 'Bir hata oluştu: ' . $e->getMessage();
        }

        return $result;
    }

    /**
     * Fetch XML from TCMB
     */
    protected function fetchXML(): ?\SimpleXMLElement
    {
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'user_agent' => 'Mozilla/5.0 (compatible; SirketFinansTakip/1.0)',
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        $content = @file_get_contents(self::TCMB_URL, false, $context);

        if ($content === false) {
            // Try with cURL as fallback
            return $this->fetchWithCurl();
        }

        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($content);

        return $xml ?: null;
    }

    /**
     * Fetch XML using cURL as fallback
     */
    protected function fetchWithCurl(): ?\SimpleXMLElement
    {
        if (!function_exists('curl_init')) {
            return null;
        }

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => self::TCMB_URL,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; SirketFinansTakip/1.0)',
        ]);

        $content = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || $content === false) {
            return null;
        }

        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($content);

        return $xml ?: null;
    }

    /**
     * Parse TCMB date format (MM/DD/YYYY) to Y-m-d
     */
    protected function parseDate(string $dateStr): ?string
    {
        // TCMB format: MM/DD/YYYY
        $parts = explode('/', $dateStr);

        if (count($parts) !== 3) {
            return null;
        }

        $month = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
        $day = str_pad($parts[1], 2, '0', STR_PAD_LEFT);
        $year = $parts[2];

        return "{$year}-{$month}-{$day}";
    }

    /**
     * Fetch rates for a specific date (historical)
     */
    public function fetchRatesForDate(string $date): array
    {
        $result = [
            'success' => false,
            'rates' => [],
            'date' => $date,
            'message' => '',
        ];

        // Format: YYYYMM/DDMMYYYY
        $year = substr($date, 0, 4);
        $month = substr($date, 5, 2);
        $day = substr($date, 8, 2);

        $url = "https://www.tcmb.gov.tr/kurlar/{$year}{$month}/{$day}{$month}{$year}.xml";

        try {
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
            ]);

            $content = @file_get_contents($url, false, $context);

            if ($content === false) {
                $result['message'] = 'Bu tarih için kur bilgisi bulunamadı.';
                return $result;
            }

            libxml_use_internal_errors(true);
            $xml = simplexml_load_string($content);

            if (!$xml) {
                $result['message'] = 'XML verisi okunamadı.';
                return $result;
            }

            foreach ($xml->Currency as $currency) {
                $code = (string) $currency->attributes()['CurrencyCode'];

                if (in_array($code, self::CURRENCIES)) {
                    $forexSelling = (float) str_replace(',', '.', (string) $currency->ForexSelling);

                    if ($forexSelling > 0) {
                        $result['rates'][$code] = $forexSelling;
                        $this->exchangeRateModel->upsertRate($date, $code, $forexSelling, 'tcmb');
                    }
                }
            }

            $result['success'] = count($result['rates']) > 0;
            $result['message'] = $result['success']
                ? 'Kurlar başarıyla alındı.'
                : 'Kur bilgisi bulunamadı.';

        } catch (\Exception $e) {
            $result['message'] = 'Bir hata oluştu: ' . $e->getMessage();
        }

        return $result;
    }
}
