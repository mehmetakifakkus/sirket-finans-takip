<?php

namespace App\Controllers;

use App\Models\DebtModel;
use App\Models\PartyModel;
use App\Models\InstallmentModel;
use App\Services\DebtService;
use App\Services\CurrencyService;

class DebtController extends BaseController
{
    protected DebtModel $debtModel;
    protected PartyModel $partyModel;
    protected InstallmentModel $installmentModel;
    protected DebtService $debtService;
    protected CurrencyService $currencyService;

    public function __construct()
    {
        $this->debtModel = new DebtModel();
        $this->partyModel = new PartyModel();
        $this->installmentModel = new InstallmentModel();
        $this->debtService = new DebtService();
        $this->currencyService = new CurrencyService();
    }

    /**
     * List all debts/receivables
     */
    public function index()
    {
        $filters = [
            'kind'     => $this->request->getGet('kind'),
            'status'   => $this->request->getGet('status'),
            'party_id' => $this->request->getGet('party_id'),
            'currency' => $this->request->getGet('currency'),
        ];

        $filters = array_filter($filters);

        $debts = $this->debtModel->getFiltered($filters);

        // Add remaining amounts
        foreach ($debts as &$debt) {
            $debt['paid_amount'] = $this->debtModel->calculatePaidAmount($debt['id']);
            $debt['remaining_amount'] = (float) $debt['principal_amount'] - $debt['paid_amount'];
        }

        $summary = $this->debtService->getSummary();

        return $this->render('debts/index', [
            'title'      => 'Borç / Alacak',
            'debts'      => $debts,
            'filters'    => $filters,
            'summary'    => $summary,
            'parties'    => $this->partyModel->getForDropdown(),
            'currencies' => $this->currencyService->getForDropdown(),
        ]);
    }

    /**
     * Show debt details
     */
    public function show(int $id)
    {
        $debt = $this->debtService->getWithDetails($id);

        if (!$debt) {
            return $this->redirectWithError('/debts', 'Borç/Alacak bulunamadı.');
        }

        return $this->render('debts/show', [
            'title' => $debt['kind'] === 'debt' ? 'Borç Detayı' : 'Alacak Detayı',
            'debt'  => $debt,
        ]);
    }

    /**
     * Show create form
     */
    public function create()
    {
        $kind = $this->request->getGet('kind') ?? 'debt';

        return $this->render('debts/form', [
            'title'      => $kind === 'debt' ? 'Yeni Borç' : 'Yeni Alacak',
            'debt'       => null,
            'parties'    => $this->partyModel->getForDropdown(),
            'currencies' => $this->currencyService->getForDropdown(),
            'kind'       => $kind,
            'action'     => 'create',
        ]);
    }

    /**
     * Store new debt/receivable
     */
    public function store()
    {
        $rules = [
            'kind'             => 'required|in_list[debt,receivable]',
            'party_id'         => 'required|integer',
            'principal_amount' => 'required|decimal',
            'currency'         => 'required|max_length[3]',
            'status'           => 'required|in_list[open,closed]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'kind'             => $this->request->getPost('kind'),
            'party_id'         => $this->request->getPost('party_id'),
            'principal_amount' => $this->request->getPost('principal_amount'),
            'currency'         => $this->request->getPost('currency'),
            'vat_rate'         => $this->request->getPost('vat_rate') ?: 0,
            'start_date'       => $this->request->getPost('start_date') ?: null,
            'due_date'         => $this->request->getPost('due_date') ?: null,
            'status'           => $this->request->getPost('status'),
            'notes'            => $this->request->getPost('notes'),
        ];

        $result = $this->debtService->create($data);

        if ($result['success']) {
            // Create installments if requested
            $installmentCount = (int) $this->request->getPost('installment_count');
            if ($installmentCount > 0) {
                $this->debtService->createInstallments(
                    $result['id'],
                    $installmentCount,
                    $data['start_date']
                );
            }

            return $this->redirectWithSuccess('/debts/' . $result['id'], $result['message']);
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
            return redirect()->to('/debts');
        }

        $debt = $this->debtModel->find($id);

        if (!$debt) {
            return $this->redirectWithError('/debts', 'Borç/Alacak bulunamadı.');
        }

        return $this->render('debts/form', [
            'title'      => 'Borç/Alacak Düzenle',
            'debt'       => $debt,
            'parties'    => $this->partyModel->getForDropdown(),
            'currencies' => $this->currencyService->getForDropdown(),
            'kind'       => $debt['kind'],
            'action'     => 'edit',
        ]);
    }

    /**
     * Update debt/receivable
     */
    public function update(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/debts');
        }

        $debt = $this->debtModel->find($id);

        if (!$debt) {
            return $this->redirectWithError('/debts', 'Borç/Alacak bulunamadı.');
        }

        $rules = [
            'kind'             => 'required|in_list[debt,receivable]',
            'party_id'         => 'required|integer',
            'principal_amount' => 'required|decimal',
            'currency'         => 'required|max_length[3]',
            'status'           => 'required|in_list[open,closed]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'kind'             => $this->request->getPost('kind'),
            'party_id'         => $this->request->getPost('party_id'),
            'principal_amount' => $this->request->getPost('principal_amount'),
            'currency'         => $this->request->getPost('currency'),
            'vat_rate'         => $this->request->getPost('vat_rate') ?: 0,
            'start_date'       => $this->request->getPost('start_date') ?: null,
            'due_date'         => $this->request->getPost('due_date') ?: null,
            'status'           => $this->request->getPost('status'),
            'notes'            => $this->request->getPost('notes'),
        ];

        $result = $this->debtService->update($id, $data);

        if ($result['success']) {
            return $this->redirectWithSuccess('/debts/' . $id, $result['message']);
        }

        return redirect()->back()
            ->withInput()
            ->with('error', $result['message'])
            ->with('errors', $result['errors'] ?? []);
    }

    /**
     * Delete debt/receivable
     */
    public function delete(int $id)
    {
        if (!$this->checkDeletePermission()) {
            return redirect()->to('/debts');
        }

        $result = $this->debtService->delete($id);

        if ($result['success']) {
            return $this->redirectWithSuccess('/debts', $result['message']);
        }

        return $this->redirectWithError('/debts', $result['message']);
    }
}
