<?php

namespace App\Controllers;

use App\Models\PaymentModel;
use App\Services\PaymentService;

class PaymentController extends BaseController
{
    protected PaymentModel $paymentModel;
    protected PaymentService $paymentService;

    public function __construct()
    {
        $this->paymentModel = new PaymentModel();
        $this->paymentService = new PaymentService();
    }

    /**
     * List all payments
     */
    public function index()
    {
        $payments = $this->paymentModel->getAllWithDetails();

        return $this->render('payments/index', [
            'title'    => 'Ödemeler',
            'payments' => $payments,
        ]);
    }

    /**
     * Show create form (generic)
     */
    public function create()
    {
        return $this->render('payments/form', [
            'title'          => 'Yeni Ödeme',
            'payment'        => null,
            'paymentMethods' => PaymentService::getMethodOptions(),
            'action'         => 'create',
        ]);
    }

    /**
     * Store new payment
     */
    public function store()
    {
        $rules = [
            'related_type' => 'required|in_list[installment,debt,milestone]',
            'related_id'   => 'required|integer',
            'date'         => 'required|valid_date',
            'amount'       => 'required|decimal',
            'currency'     => 'required|max_length[3]',
            'method'       => 'required|in_list[cash,bank,card,other]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $relatedType = $this->request->getPost('related_type');
        $relatedId = (int) $this->request->getPost('related_id');

        $paymentData = [
            'date'               => $this->request->getPost('date'),
            'amount'             => $this->request->getPost('amount'),
            'method'             => $this->request->getPost('method'),
            'notes'              => $this->request->getPost('notes'),
            'create_transaction' => $this->request->getPost('create_transaction') ? true : false,
        ];

        if ($relatedType === 'installment') {
            $result = $this->paymentService->payInstallment($relatedId, $paymentData);
        } elseif ($relatedType === 'debt') {
            $result = $this->paymentService->payDebt($relatedId, $paymentData);
        } else {
            return redirect()->back()
                ->withInput()
                ->with('error', 'Geçersiz ödeme tipi.');
        }

        if ($result['success']) {
            return $this->redirectWithSuccess('/payments', $result['message']);
        }

        return redirect()->back()
            ->withInput()
            ->with('error', $result['message']);
    }

    /**
     * Delete payment
     */
    public function delete(int $id)
    {
        if (!$this->checkDeletePermission()) {
            return redirect()->to('/payments');
        }

        $result = $this->paymentService->delete($id);

        if ($result['success']) {
            return $this->redirectWithSuccess('/payments', $result['message']);
        }

        return $this->redirectWithError('/payments', $result['message']);
    }
}
