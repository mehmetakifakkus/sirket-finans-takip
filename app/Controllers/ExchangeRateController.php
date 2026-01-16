<?php

namespace App\Controllers;

use App\Models\ExchangeRateModel;
use App\Models\AuditLogModel;
use App\Services\TCMBService;
use App\Services\CurrencyService;

class ExchangeRateController extends BaseController
{
    protected ExchangeRateModel $exchangeRateModel;
    protected AuditLogModel $auditLogModel;
    protected TCMBService $tcmbService;
    protected CurrencyService $currencyService;

    public function __construct()
    {
        $this->exchangeRateModel = new ExchangeRateModel();
        $this->auditLogModel = new AuditLogModel();
        $this->tcmbService = new TCMBService();
        $this->currencyService = new CurrencyService();
    }

    /**
     * List all exchange rates
     */
    public function index()
    {
        $currency = $this->request->getGet('currency');
        $dateFrom = $this->request->getGet('date_from');
        $dateTo = $this->request->getGet('date_to');

        $builder = $this->exchangeRateModel;

        if ($currency) {
            $builder = $builder->where('quote_currency', $currency);
        }

        if ($dateFrom) {
            $builder = $builder->where('rate_date >=', $dateFrom);
        }

        if ($dateTo) {
            $builder = $builder->where('rate_date <=', $dateTo);
        }

        $rates = $builder->orderBy('rate_date', 'DESC')
                         ->orderBy('quote_currency', 'ASC')
                         ->findAll();

        // Get latest rates
        $latestRates = $this->exchangeRateModel->getLatestRates();

        return $this->render('exchange_rates/index', [
            'title'       => 'Döviz Kurları',
            'rates'       => $rates,
            'latestRates' => $latestRates,
            'filters'     => [
                'currency'  => $currency,
                'date_from' => $dateFrom,
                'date_to'   => $dateTo,
            ],
            'currencies'  => ['USD' => 'USD - Amerikan Doları', 'EUR' => 'EUR - Euro'],
        ]);
    }

    /**
     * Show create form
     */
    public function create()
    {
        return $this->render('exchange_rates/form', [
            'title'      => 'Yeni Kur Girişi',
            'rate'       => null,
            'currencies' => ['USD' => 'USD - Amerikan Doları', 'EUR' => 'EUR - Euro'],
            'action'     => 'create',
        ]);
    }

    /**
     * Store new exchange rate
     */
    public function store()
    {
        $rules = [
            'rate_date'      => 'required|valid_date',
            'quote_currency' => 'required|in_list[USD,EUR]',
            'rate'           => 'required|decimal',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $date = $this->request->getPost('rate_date');
        $currency = $this->request->getPost('quote_currency');
        $rate = (float) $this->request->getPost('rate');

        // Check if rate already exists
        if ($this->exchangeRateModel->rateExists($date, $currency)) {
            return redirect()->back()
                ->withInput()
                ->with('error', 'Bu tarih ve para birimi için zaten kur kaydı mevcut.');
        }

        $data = [
            'rate_date'      => $date,
            'base_currency'  => 'TRY',
            'quote_currency' => $currency,
            'rate'           => $rate,
            'source'         => 'manual',
            'created_at'     => date('Y-m-d H:i:s'),
        ];

        $id = $this->exchangeRateModel->insert($data);

        if ($id) {
            $this->auditLogModel->logAction('create', 'rate', $id, null, $data);
            return $this->redirectWithSuccess('/exchange-rates', 'Kur başarıyla eklendi.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Kur eklenemedi.');
    }

    /**
     * Show edit form
     */
    public function edit(int $id)
    {
        $rate = $this->exchangeRateModel->find($id);

        if (!$rate) {
            return $this->redirectWithError('/exchange-rates', 'Kur kaydı bulunamadı.');
        }

        return $this->render('exchange_rates/form', [
            'title'      => 'Kur Düzenle',
            'rate'       => $rate,
            'currencies' => ['USD' => 'USD - Amerikan Doları', 'EUR' => 'EUR - Euro'],
            'action'     => 'edit',
        ]);
    }

    /**
     * Update exchange rate
     */
    public function update(int $id)
    {
        $existingRate = $this->exchangeRateModel->find($id);

        if (!$existingRate) {
            return $this->redirectWithError('/exchange-rates', 'Kur kaydı bulunamadı.');
        }

        $rules = [
            'rate_date'      => 'required|valid_date',
            'quote_currency' => 'required|in_list[USD,EUR]',
            'rate'           => 'required|decimal',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'rate_date'      => $this->request->getPost('rate_date'),
            'quote_currency' => $this->request->getPost('quote_currency'),
            'rate'           => (float) $this->request->getPost('rate'),
            'source'         => 'manual',
        ];

        $oldData = $existingRate;

        if ($this->exchangeRateModel->update($id, $data)) {
            $this->auditLogModel->logAction('update', 'rate', $id, $oldData, $data);
            return $this->redirectWithSuccess('/exchange-rates', 'Kur başarıyla güncellendi.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Kur güncellenemedi.');
    }

    /**
     * Delete exchange rate
     */
    public function delete(int $id)
    {
        $rate = $this->exchangeRateModel->find($id);

        if (!$rate) {
            return $this->redirectWithError('/exchange-rates', 'Kur kaydı bulunamadı.');
        }

        if ($this->exchangeRateModel->delete($id)) {
            $this->auditLogModel->logAction('delete', 'rate', $id, $rate, null);
            return $this->redirectWithSuccess('/exchange-rates', 'Kur başarıyla silindi.');
        }

        return $this->redirectWithError('/exchange-rates', 'Kur silinemedi.');
    }

    /**
     * Fetch rates from TCMB
     */
    public function fetchTCMB()
    {
        $result = $this->tcmbService->fetchTodayRates();

        if ($result['success']) {
            $ratesInfo = [];
            foreach ($result['rates'] as $currency => $rate) {
                $ratesInfo[] = "{$currency}: {$rate}";
            }

            $message = "TCMB kurları alındı ({$result['date']}): " . implode(', ', $ratesInfo);
            return $this->redirectWithSuccess('/exchange-rates', $message);
        }

        return $this->redirectWithError('/exchange-rates', $result['message']);
    }
}
