<?php

namespace App\Controllers;

use App\Models\TransactionModel;
use App\Models\PartyModel;
use App\Models\CategoryModel;
use App\Models\ProjectModel;
use App\Models\ProjectMilestoneModel;
use App\Services\TransactionService;
use App\Services\CurrencyService;
use App\Services\FileUploadService;

class TransactionController extends BaseController
{
    protected TransactionModel $transactionModel;
    protected PartyModel $partyModel;
    protected CategoryModel $categoryModel;
    protected ProjectModel $projectModel;
    protected ProjectMilestoneModel $milestoneModel;
    protected TransactionService $transactionService;
    protected CurrencyService $currencyService;
    protected FileUploadService $fileUploadService;

    public function __construct()
    {
        $this->transactionModel = new TransactionModel();
        $this->partyModel = new PartyModel();
        $this->categoryModel = new CategoryModel();
        $this->projectModel = new ProjectModel();
        $this->milestoneModel = new ProjectMilestoneModel();
        $this->transactionService = new TransactionService();
        $this->currencyService = new CurrencyService();
        $this->fileUploadService = new FileUploadService();
    }

    /**
     * List all transactions
     */
    public function index()
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

        // Remove empty filters
        $filters = array_filter($filters);

        $transactions = $this->transactionService->getFilteredWithTRY($filters);

        // Calculate totals
        $totals = ['income' => 0, 'expense' => 0];
        foreach ($transactions as $t) {
            $totals[$t['type']] += $t['amount_try'];
        }

        return $this->render('transactions/index', [
            'title'        => 'Gelir/Gider İşlemleri',
            'transactions' => $transactions,
            'totals'       => $totals,
            'filters'      => $filters,
            'parties'      => $this->partyModel->getForDropdown(),
            'categories'   => $this->categoryModel->getForDropdown(),
            'projects'     => $this->projectModel->getForDropdown(),
            'currencies'   => $this->currencyService->getForDropdown(),
        ]);
    }

    /**
     * Show transaction details
     */
    public function show(int $id)
    {
        $transaction = $this->transactionService->getWithTRY($id);

        if (!$transaction) {
            return $this->redirectWithError('/transactions', 'İşlem bulunamadı.');
        }

        return $this->render('transactions/show', [
            'title'       => 'İşlem Detayı',
            'transaction' => $transaction,
        ]);
    }

    /**
     * Show create form
     */
    public function create()
    {
        $type = $this->request->getGet('type') ?? 'income';

        return $this->render('transactions/form', [
            'title'       => $type === 'income' ? 'Yeni Gelir' : 'Yeni Gider',
            'transaction' => null,
            'parties'     => $this->partyModel->getForDropdown(),
            'categories'  => $this->categoryModel->getForDropdown($type),
            'projects'    => $this->projectModel->getForDropdown(),
            'currencies'  => $this->currencyService->getForDropdown(),
            'type'        => $type,
            'action'      => 'create',
        ]);
    }

    /**
     * Store new transaction
     */
    public function store()
    {
        $rules = [
            'type'     => 'required|in_list[income,expense]',
            'date'     => 'required|valid_date',
            'amount'   => 'required|decimal',
            'currency' => 'required|max_length[3]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'type'             => $this->request->getPost('type'),
            'party_id'         => $this->request->getPost('party_id'),
            'category_id'      => $this->request->getPost('category_id'),
            'project_id'       => $this->request->getPost('project_id'),
            'milestone_id'     => $this->request->getPost('milestone_id'),
            'date'             => $this->request->getPost('date'),
            'amount'           => $this->request->getPost('amount'),
            'currency'         => $this->request->getPost('currency'),
            'vat_rate'         => $this->request->getPost('vat_rate') ?: 0,
            'withholding_rate' => $this->request->getPost('withholding_rate') ?: 0,
            'description'      => $this->request->getPost('description'),
            'ref_no'           => $this->request->getPost('ref_no'),
        ];

        // Handle file upload
        $file = $this->request->getFile('document');
        if ($file && $file->isValid()) {
            $uploadResult = $this->fileUploadService->uploadDocument($file);
            if ($uploadResult['success']) {
                $data['document_path'] = $uploadResult['file_path'];
            } else {
                return redirect()->back()
                    ->withInput()
                    ->with('error', $uploadResult['message']);
            }
        }

        $result = $this->transactionService->create($data);

        if ($result['success']) {
            return $this->redirectWithSuccess('/transactions', $result['message']);
        }

        return redirect()->back()
            ->withInput()
            ->with('error', $result['message'])
            ->with('errors', $result['errors'] ?? []);
    }

    /**
     * Show edit form
     */
    public function edit(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/transactions');
        }

        $transaction = $this->transactionModel->find($id);

        if (!$transaction) {
            return $this->redirectWithError('/transactions', 'İşlem bulunamadı.');
        }

        return $this->render('transactions/form', [
            'title'       => 'İşlem Düzenle',
            'transaction' => $transaction,
            'parties'     => $this->partyModel->getForDropdown(),
            'categories'  => $this->categoryModel->getForDropdown($transaction['type']),
            'projects'    => $this->projectModel->getForDropdown(),
            'currencies'  => $this->currencyService->getForDropdown(),
            'type'        => $transaction['type'],
            'action'      => 'edit',
        ]);
    }

    /**
     * Update transaction
     */
    public function update(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/transactions');
        }

        $transaction = $this->transactionModel->find($id);

        if (!$transaction) {
            return $this->redirectWithError('/transactions', 'İşlem bulunamadı.');
        }

        $rules = [
            'type'     => 'required|in_list[income,expense]',
            'date'     => 'required|valid_date',
            'amount'   => 'required|decimal',
            'currency' => 'required|max_length[3]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'type'             => $this->request->getPost('type'),
            'party_id'         => $this->request->getPost('party_id'),
            'category_id'      => $this->request->getPost('category_id'),
            'project_id'       => $this->request->getPost('project_id'),
            'milestone_id'     => $this->request->getPost('milestone_id'),
            'date'             => $this->request->getPost('date'),
            'amount'           => $this->request->getPost('amount'),
            'currency'         => $this->request->getPost('currency'),
            'vat_rate'         => $this->request->getPost('vat_rate') ?: 0,
            'withholding_rate' => $this->request->getPost('withholding_rate') ?: 0,
            'description'      => $this->request->getPost('description'),
            'ref_no'           => $this->request->getPost('ref_no'),
        ];

        // Handle file upload
        $file = $this->request->getFile('document');
        if ($file && $file->isValid()) {
            // Delete old file
            if (!empty($transaction['document_path'])) {
                $this->fileUploadService->deleteDocument($transaction['document_path']);
            }

            $uploadResult = $this->fileUploadService->uploadDocument($file);
            if ($uploadResult['success']) {
                $data['document_path'] = $uploadResult['file_path'];
            } else {
                return redirect()->back()
                    ->withInput()
                    ->with('error', $uploadResult['message']);
            }
        }

        $result = $this->transactionService->update($id, $data);

        if ($result['success']) {
            return $this->redirectWithSuccess('/transactions', $result['message']);
        }

        return redirect()->back()
            ->withInput()
            ->with('error', $result['message'])
            ->with('errors', $result['errors'] ?? []);
    }

    /**
     * Delete transaction
     */
    public function delete(int $id)
    {
        if (!$this->checkDeletePermission()) {
            return redirect()->to('/transactions');
        }

        $result = $this->transactionService->delete($id);

        if ($result['success']) {
            return $this->redirectWithSuccess('/transactions', $result['message']);
        }

        return $this->redirectWithError('/transactions', $result['message']);
    }

    /**
     * Export transactions to CSV
     */
    public function export()
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

        $csv = $this->transactionService->exportToCSV($filters);

        $filename = 'islemler_' . date('Y-m-d_His') . '.csv';

        return $this->response
            ->setHeader('Content-Type', 'text/csv; charset=utf-8')
            ->setHeader('Content-Disposition', "attachment; filename=\"{$filename}\"")
            ->setBody("\xEF\xBB\xBF" . $csv); // UTF-8 BOM for Excel
    }
}
