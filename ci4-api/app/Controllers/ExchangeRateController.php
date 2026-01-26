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
        $errors = $this->validateRequired($data, ['currency', 'rate', 'date']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        // Check if rate already exists
        if ($this->exchangeRateModel->rateExists($data['currency'], $data['date'])) {
            return $this->error('Bu tarih için bu para birimi kuru zaten mevcut', 409);
        }

        $insertData = [
            'currency' => $data['currency'],
            'rate' => (float)$data['rate'],
            'date' => $data['date'],
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
     * Fetch gold prices
     * POST /api/exchange-rates/fetch-gold
     */
    public function fetchGold()
    {
        try {
            // Use a simple gold price API or hardcoded for now
            // In production, use a proper API like goldapi.io
            $url = 'https://www.tcmb.gov.tr/kurlar/today.xml';
            $context = stream_context_create([
                'http' => ['timeout' => 10],
                'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
            ]);

            $xml = @file_get_contents($url, false, $context);
            if (!$xml) {
                return $this->error('Altın fiyatı alınamadı', 500);
            }

            $data = simplexml_load_string($xml);
            if (!$data) {
                return $this->error('Veri okunamadı', 500);
            }

            $date = date('Y-m-d');
            $goldRate = null;

            foreach ($data->Currency as $currency) {
                $code = (string)$currency['Kod'];
                if ($code === 'XAU') {
                    $goldRate = (float)$currency->ForexSelling;
                    break;
                }
            }

            if ($goldRate && $goldRate > 0) {
                $this->exchangeRateModel->upsertRate('GOLD', $goldRate, $date, 'tcmb');

                return $this->success('Altın fiyatı güncellendi', [
                    'date' => $date,
                    'rate' => $goldRate
                ]);
            }

            return $this->jsonResponse(['success' => false, 'message' => 'Altın fiyatı TCMB verisinde bulunamadı'], 200);

        } catch (\Exception $e) {
            return $this->error('Altın fiyatı alınamadı: ' . $e->getMessage(), 500);
        }
    }
}
