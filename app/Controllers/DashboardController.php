<?php

namespace App\Controllers;

use App\Services\ReportService;
use App\Services\CurrencyService;

class DashboardController extends BaseController
{
    protected ReportService $reportService;
    protected CurrencyService $currencyService;

    public function __construct()
    {
        $this->reportService = new ReportService();
        $this->currencyService = new CurrencyService();
    }

    /**
     * Dashboard index
     */
    public function index()
    {
        $dashboardData = $this->reportService->getDashboardData();

        // Get latest exchange rates
        $latestRates = $this->currencyService->getLatestRates();

        $data = [
            'title'       => 'Dashboard',
            'dashboard'   => $dashboardData,
            'rates'       => $latestRates,
            'currentYear' => date('Y'),
        ];

        return $this->render('dashboard/index', $data);
    }
}
