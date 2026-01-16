<?php

namespace App\Controllers;

use App\Models\PartyModel;
use App\Models\CategoryModel;
use App\Models\ProjectModel;
use App\Services\ReportService;
use App\Services\CurrencyService;

class ReportController extends BaseController
{
    protected ReportService $reportService;
    protected CurrencyService $currencyService;
    protected PartyModel $partyModel;
    protected CategoryModel $categoryModel;
    protected ProjectModel $projectModel;

    public function __construct()
    {
        $this->reportService = new ReportService();
        $this->currencyService = new CurrencyService();
        $this->partyModel = new PartyModel();
        $this->categoryModel = new CategoryModel();
        $this->projectModel = new ProjectModel();
    }

    /**
     * Reports index page
     */
    public function index()
    {
        return $this->render('reports/index', [
            'title' => 'Raporlar',
        ]);
    }

    /**
     * Transaction report
     */
    public function transactions()
    {
        $filters = [
            'type'        => $this->request->getGet('type'),
            'category_id' => $this->request->getGet('category_id'),
            'party_id'    => $this->request->getGet('party_id'),
            'project_id'  => $this->request->getGet('project_id'),
            'currency'    => $this->request->getGet('currency'),
            'date_from'   => $this->request->getGet('date_from'),
            'date_to'     => $this->request->getGet('date_to'),
        ];

        $filters = array_filter($filters);

        $report = $this->reportService->getTransactionReport($filters);

        return $this->render('reports/transactions', [
            'title'        => 'İşlem Raporu',
            'report'       => $report,
            'filters'      => $filters,
            'parties'      => $this->partyModel->getForDropdown(),
            'categories'   => $this->categoryModel->getForDropdown(),
            'projects'     => $this->projectModel->getForDropdown(),
            'currencies'   => $this->currencyService->getForDropdown(),
        ]);
    }

    /**
     * Debt report
     */
    public function debts()
    {
        $filters = [
            'kind'     => $this->request->getGet('kind'),
            'status'   => $this->request->getGet('status'),
            'party_id' => $this->request->getGet('party_id'),
            'currency' => $this->request->getGet('currency'),
        ];

        $filters = array_filter($filters);

        $report = $this->reportService->getDebtReport($filters);

        return $this->render('reports/debts', [
            'title'      => 'Borç/Alacak Raporu',
            'report'     => $report,
            'filters'    => $filters,
            'parties'    => $this->partyModel->getForDropdown(),
            'currencies' => $this->currencyService->getForDropdown(),
        ]);
    }

    /**
     * Project report
     */
    public function projects()
    {
        $report = $this->reportService->getProjectReport();

        return $this->render('reports/projects', [
            'title'  => 'Proje Raporu',
            'report' => $report,
        ]);
    }

    /**
     * Export report as CSV
     */
    public function exportCSV(string $reportType)
    {
        $filters = [];

        if ($reportType === 'transactions') {
            $filters = [
                'type'        => $this->request->getGet('type'),
                'category_id' => $this->request->getGet('category_id'),
                'party_id'    => $this->request->getGet('party_id'),
                'project_id'  => $this->request->getGet('project_id'),
                'currency'    => $this->request->getGet('currency'),
                'date_from'   => $this->request->getGet('date_from'),
                'date_to'     => $this->request->getGet('date_to'),
            ];
        } elseif ($reportType === 'debts') {
            $filters = [
                'kind'     => $this->request->getGet('kind'),
                'status'   => $this->request->getGet('status'),
                'party_id' => $this->request->getGet('party_id'),
                'currency' => $this->request->getGet('currency'),
            ];
        }

        $filters = array_filter($filters);

        $csv = $this->reportService->exportCSV($reportType, $filters);

        if (empty($csv)) {
            return $this->redirectWithError('/reports', 'Rapor türü bulunamadı.');
        }

        $filename = $reportType . '_rapor_' . date('Y-m-d_His') . '.csv';

        return $this->response
            ->setHeader('Content-Type', 'text/csv; charset=utf-8')
            ->setHeader('Content-Disposition', "attachment; filename=\"{$filename}\"")
            ->setBody("\xEF\xBB\xBF" . $csv); // UTF-8 BOM for Excel
    }
}
