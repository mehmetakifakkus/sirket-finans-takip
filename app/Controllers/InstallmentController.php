<?php

namespace App\Controllers;

use App\Models\DebtModel;
use App\Models\InstallmentModel;
use App\Models\AuditLogModel;
use App\Services\PaymentService;
use App\Services\CurrencyService;

class InstallmentController extends BaseController
{
    protected DebtModel $debtModel;
    protected InstallmentModel $installmentModel;
    protected AuditLogModel $auditLogModel;
    protected PaymentService $paymentService;
    protected CurrencyService $currencyService;

    public function __construct()
    {
        $this->debtModel = new DebtModel();
        $this->installmentModel = new InstallmentModel();
        $this->auditLogModel = new AuditLogModel();
        $this->paymentService = new PaymentService();
        $this->currencyService = new CurrencyService();
    }

    /**
     * Show create form
     */
    public function create(int $debtId)
    {
        $debt = $this->debtModel->getWithPartyById($debtId);

        if (!$debt) {
            return $this->redirectWithError('/debts', 'Borç/Alacak bulunamadı.');
        }

        $currencies = $this->currencyService->getForDropdown();

        return $this->render('debts/installment_form', [
            'title'       => 'Yeni Taksit',
            'debt'        => $debt,
            'installment' => null,
            'currencies'  => $currencies,
            'action'      => 'create',
        ]);
    }

    /**
     * Store new installment
     */
    public function store(int $debtId)
    {
        $debt = $this->debtModel->find($debtId);

        if (!$debt) {
            return $this->redirectWithError('/debts', 'Borç/Alacak bulunamadı.');
        }

        $rules = [
            'due_date' => 'required|valid_date',
            'amount'   => 'required|decimal',
            'currency' => 'required|max_length[3]',
            'status'   => 'required|in_list[pending,paid,partial]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $amount = (float) $this->request->getPost('amount');

        // Validate total doesn't exceed principal
        $validation = $this->installmentModel->validateTotalAgainstPrincipal($debtId, $amount);
        if (!$validation['valid']) {
            return redirect()->back()
                ->withInput()
                ->with('warning', $validation['message']);
        }

        $data = [
            'debt_id'     => $debtId,
            'due_date'    => $this->request->getPost('due_date'),
            'amount'      => $amount,
            'currency'    => $this->request->getPost('currency'),
            'status'      => $this->request->getPost('status'),
            'paid_amount' => $this->request->getPost('paid_amount') ?: 0,
            'notes'       => $this->request->getPost('notes'),
        ];

        $id = $this->installmentModel->insert($data);

        if ($id) {
            $this->auditLogModel->logAction('create', 'installment', $id, null, $data);
            return $this->redirectWithSuccess('/debts/' . $debtId, 'Taksit başarıyla oluşturuldu.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Taksit oluşturulamadı.');
    }

    /**
     * Show edit form
     */
    public function edit(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/debts');
        }

        $installment = $this->installmentModel->find($id);

        if (!$installment) {
            return $this->redirectWithError('/debts', 'Taksit bulunamadı.');
        }

        $debt = $this->debtModel->getWithPartyById($installment['debt_id']);
        $currencies = $this->currencyService->getForDropdown();

        return $this->render('debts/installment_form', [
            'title'       => 'Taksit Düzenle',
            'debt'        => $debt,
            'installment' => $installment,
            'currencies'  => $currencies,
            'action'      => 'edit',
        ]);
    }

    /**
     * Update installment
     */
    public function update(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/debts');
        }

        $installment = $this->installmentModel->find($id);

        if (!$installment) {
            return $this->redirectWithError('/debts', 'Taksit bulunamadı.');
        }

        $rules = [
            'due_date' => 'required|valid_date',
            'amount'   => 'required|decimal',
            'currency' => 'required|max_length[3]',
            'status'   => 'required|in_list[pending,paid,partial]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $amount = (float) $this->request->getPost('amount');

        // Validate total doesn't exceed principal
        $validation = $this->installmentModel->validateTotalAgainstPrincipal(
            $installment['debt_id'],
            $amount,
            $id
        );
        if (!$validation['valid']) {
            return redirect()->back()
                ->withInput()
                ->with('warning', $validation['message']);
        }

        $data = [
            'due_date'    => $this->request->getPost('due_date'),
            'amount'      => $amount,
            'currency'    => $this->request->getPost('currency'),
            'status'      => $this->request->getPost('status'),
            'paid_amount' => $this->request->getPost('paid_amount') ?: 0,
            'notes'       => $this->request->getPost('notes'),
        ];

        $oldData = $installment;

        if ($this->installmentModel->update($id, $data)) {
            $this->auditLogModel->logAction('update', 'installment', $id, $oldData, $data);
            return $this->redirectWithSuccess('/debts/' . $installment['debt_id'], 'Taksit başarıyla güncellendi.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Taksit güncellenemedi.');
    }

    /**
     * Delete installment
     */
    public function delete(int $id)
    {
        if (!$this->checkDeletePermission()) {
            return redirect()->to('/debts');
        }

        $installment = $this->installmentModel->find($id);

        if (!$installment) {
            return $this->redirectWithError('/debts', 'Taksit bulunamadı.');
        }

        $debtId = $installment['debt_id'];

        if ($this->installmentModel->delete($id)) {
            $this->auditLogModel->logAction('delete', 'installment', $id, $installment, null);
            return $this->redirectWithSuccess('/debts/' . $debtId, 'Taksit başarıyla silindi.');
        }

        return $this->redirectWithError('/debts/' . $debtId, 'Taksit silinemedi.');
    }

    /**
     * Show payment form for installment
     */
    public function pay(int $id)
    {
        $installment = $this->installmentModel->find($id);

        if (!$installment) {
            return $this->redirectWithError('/debts', 'Taksit bulunamadı.');
        }

        $debt = $this->debtModel->getWithPartyById($installment['debt_id']);
        $remainingAmount = $this->installmentModel->getRemainingAmount($id);

        // Handle POST request
        if ($this->request->getMethod() === 'post') {
            $rules = [
                'date'   => 'required|valid_date',
                'amount' => 'required|decimal',
                'method' => 'required|in_list[cash,bank,card,other]',
            ];

            if (!$this->validate($rules)) {
                return redirect()->back()
                    ->withInput()
                    ->with('errors', $this->validator->getErrors());
            }

            $paymentData = [
                'date'               => $this->request->getPost('date'),
                'amount'             => $this->request->getPost('amount'),
                'method'             => $this->request->getPost('method'),
                'notes'              => $this->request->getPost('notes'),
                'create_transaction' => $this->request->getPost('create_transaction') ? true : false,
            ];

            $result = $this->paymentService->payInstallment($id, $paymentData);

            if ($result['success']) {
                return $this->redirectWithSuccess('/debts/' . $installment['debt_id'], $result['message']);
            }

            return redirect()->back()
                ->withInput()
                ->with('error', $result['message']);
        }

        return $this->render('debts/payment_form', [
            'title'           => 'Taksit Ödemesi',
            'debt'            => $debt,
            'installment'     => $installment,
            'remainingAmount' => $remainingAmount,
            'paymentMethods'  => PaymentService::getMethodOptions(),
        ]);
    }
}
