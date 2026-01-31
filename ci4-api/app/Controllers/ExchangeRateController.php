<?php

namespace App\Controllers;

use App\Models\ExchangeRateModel;

class ExchangeRateController extends BaseController
{
    protected ExchangeRateModel $exchangeRateModel;

    public function __construct()
    {
        parent::__construct();
        $this->exchangeRateModel = new ExchangeRateModel();
    }

    /**
     * List exchange rates
     * GET /api/exchange-rates
     */
    public function index()
    {
        $filters = $this->getQueryParams([
            'currency', 'start_date', 'end_date', 'limit'
        ]);

        $rates = $this->exchangeRateModel->getFiltered($filters);

        return $this->success('Döviz kurları listelendi', [
            'rates' => $rates,
            'count' => count($rates)
        ]);
    }

    /**
     * Get single rate
     * GET /api/exchange-rates/{id}
     */
    public function show(int $id)
    {
        $rate = $this->exchangeRateModel->find($id);

        if (!$rate) {
            return $this->notFound('Döviz kuru bulunamadı');
        }

        return $this->success('Döviz kuru detayı', [
            'rate' => $rate
        ]);
    }

    /**
     * Get latest rates
     * GET /api/exchange-rates/latest
     */
    public function latest()
    {
        $rates = $this->exchangeRateModel->getLatest();

        return $this->success('Güncel döviz kurları', [
            'rates' => $rates
        ]);
    }

    /**
     * Create exchange rate
     * POST /api/exchange-rates
     */
    public function create()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['quote_currency', 'rate', 'rate_date']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        // Check if rate already exists
        if ($this->exchangeRateModel->rateExists($data['quote_currency'], $data['rate_date'])) {
            return $this->error('Bu tarih için bu para birimi kuru zaten mevcut', 409);
        }

        $insertData = [
            'quote_currency' => $data['quote_currency'],
            'base_currency' => $data['base_currency'] ?? 'TRY',
            'rate' => (float)$data['rate'],
            'rate_date' => $data['rate_date'],
            'source' => $data['source'] ?? 'manual'
        ];

        $id = $this->exchangeRateModel->insert($insertData);
        if (!$id) {
            return $this->error('Döviz kuru oluşturulamadı', 500);
        }

        $rate = $this->exchangeRateModel->find($id);

        return $this->created('Döviz kuru oluşturuldu', [
            'rate' => $rate
        ]);
    }

    /**
     * Update exchange rate
     * PUT /api/exchange-rates/{id}
     */
    public function update(int $id)
    {
        $rate = $this->exchangeRateModel->find($id);
        if (!$rate) {
            return $this->notFound('Döviz kuru bulunamadı');
        }

        $data = $this->getJsonInput();

        // Check for duplicate if date/currency changed
        if ((isset($data['currency']) || isset($data['date'])) &&
            ($data['currency'] ?? $rate['currency']) !== $rate['currency'] ||
            ($data['date'] ?? $rate['date']) !== $rate['date']) {
            $newCurrency = $data['currency'] ?? $rate['currency'];
            $newDate = $data['date'] ?? $rate['date'];
            if ($this->exchangeRateModel->rateExists($newCurrency, $newDate)) {
                return $this->error('Bu tarih için bu para birimi kuru zaten mevcut', 409);
            }
        }

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at']);

        $this->exchangeRateModel->update($id, $data);

        $rate = $this->exchangeRateModel->find($id);

        return $this->success('Döviz kuru güncellendi', [
            'rate' => $rate
        ]);
    }

    /**
     * Delete exchange rate
     * DELETE /api/exchange-rates/{id}
     */
    public function delete(int $id)
    {
        $rate = $this->exchangeRateModel->find($id);
        if (!$rate) {
            return $this->notFound('Döviz kuru bulunamadı');
        }

        $this->exchangeRateModel->delete($id);

        return $this->success('Döviz kuru silindi');
    }

    /**
     * Fetch TCMB rates
     * POST /api/exchange-rates/fetch-tcmb
     */
    public function fetchTcmb()
    {
        try {
            $url = 'https://www.tcmb.gov.tr/kurlar/today.xml';
            $context = stream_context_create([
                'http' => ['timeout' => 10],
                'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
            ]);

            $xml = @file_get_contents($url, false, $context);
            if (!$xml) {
                return $this->error('TCMB\'ye bağlanılamadı', 500);
            }

            $data = simplexml_load_string($xml);
            if (!$data) {
                return $this->error('TCMB verisi okunamadı', 500);
            }

            $date = date('Y-m-d');
            $rates = [];
            $currencyMap = ['USD' => 'USD', 'EUR' => 'EUR', 'GBP' => 'GBP'];

            foreach ($data->Currency as $currency) {
                $code = (string)$currency['Kod'];
                if (isset($currencyMap[$code])) {
                    $rate = (float)$currency->ForexSelling;
                    if ($rate > 0) {
                        $this->exchangeRateModel->upsertRate($code, $rate, $date, 'tcmb');
                        $rates[$code] = $rate;
                    }
                }
            }

            return $this->success('TCMB kurları güncellendi', [
                'date' => $date,
                'rates' => $rates
            ]);

        } catch (\Exception $e) {
            return $this->error('TCMB kurları alınamadı: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Fetch gold prices (gram gold)
     * POST /api/exchange-rates/fetch-gold
     */
    public function fetchGold()
    {
        // Gold prices are not available from TCMB daily XML
        // User needs to enter gold prices manually
        return $this->error('Altın fiyatı otomatik olarak alınamıyor. Lütfen "Yeni Kur Ekle" butonu ile manuel olarak GR (gram altın) kuru girin.', 400);
    }

    /**
     * Get rate for currency on date
     * GET /api/exchange-rates/rate/{currency}/{date}
     */
    public function getRate(string $currency, string $date)
    {
        $rate = $this->exchangeRateModel->getRateForDate($currency, $date);

        if (!$rate) {
            // Try to get the most recent rate before this date
            $rate = $this->exchangeRateModel->getLatestRateForCurrency($currency);
        }

        return $this->success('Kur bilgisi', [
            'currency' => $currency,
            'date' => $date,
            'rate' => $rate ? (float)$rate['rate'] : null
        ]);
    }
}
