<?php

namespace App\Controllers;

use App\Models\TemplateModel;
use App\Models\TransactionModel;
use App\Libraries\Database;

class TemplateController extends BaseController
{
    protected TemplateModel $templateModel;
    protected TransactionModel $transactionModel;

    public function __construct()
    {
        parent::__construct();
        $this->templateModel = new TemplateModel();
        $this->transactionModel = new TransactionModel();
    }

    /**
     * List all templates
     * GET /api/templates
     */
    public function index()
    {
        $filters = $this->getQueryParams(['type', 'is_active', 'recurrence']);
        $templates = $this->templateModel->getAll($filters);

        return $this->success('Şablonlar listelendi', ['templates' => $templates]);
    }

    /**
     * Get single template
     * GET /api/templates/:id
     */
    public function show(int $id)
    {
        $template = $this->templateModel->getById($id);

        if (!$template) {
            return $this->notFound('Şablon bulunamadı');
        }

        return $this->success('Şablon detayı', $template);
    }

    /**
     * Create new template
     * POST /api/templates
     */
    public function create()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['name', 'type']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        // Validate type
        if (!in_array($data['type'], ['income', 'expense'])) {
            return $this->validationError(['type' => 'Geçersiz işlem tipi']);
        }

        // Validate recurrence if provided
        $validRecurrences = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
        if (isset($data['recurrence']) && !in_array($data['recurrence'], $validRecurrences)) {
            return $this->validationError(['recurrence' => 'Geçersiz tekrar sıklığı']);
        }

        // Set defaults
        $data['currency'] = $data['currency'] ?? 'TRY';
        $data['vat_rate'] = $data['vat_rate'] ?? 0;
        $data['withholding_rate'] = $data['withholding_rate'] ?? 0;
        $data['recurrence'] = $data['recurrence'] ?? 'none';
        $data['is_active'] = $data['is_active'] ?? 1;

        try {
            $id = $this->templateModel->create($data);
            return $this->created('Şablon oluşturuldu', ['id' => $id]);
        } catch (\Exception $e) {
            return $this->error('Şablon oluşturulamadı: ' . $e->getMessage());
        }
    }

    /**
     * Update template
     * PUT /api/templates/:id
     */
    public function update(int $id)
    {
        $template = $this->templateModel->getById($id);
        if (!$template) {
            return $this->notFound('Şablon bulunamadı');
        }

        $data = $this->getJsonInput();

        // Validate type if provided
        if (isset($data['type']) && !in_array($data['type'], ['income', 'expense'])) {
            return $this->validationError(['type' => 'Geçersiz işlem tipi']);
        }

        // Validate recurrence if provided
        $validRecurrences = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
        if (isset($data['recurrence']) && !in_array($data['recurrence'], $validRecurrences)) {
            return $this->validationError(['recurrence' => 'Geçersiz tekrar sıklığı']);
        }

        try {
            $this->templateModel->update($id, $data);
            return $this->success('Şablon güncellendi');
        } catch (\Exception $e) {
            return $this->error('Şablon güncellenemedi: ' . $e->getMessage());
        }
    }

    /**
     * Delete template
     * DELETE /api/templates/:id
     */
    public function delete(int $id)
    {
        $template = $this->templateModel->getById($id);
        if (!$template) {
            return $this->notFound('Şablon bulunamadı');
        }

        try {
            $this->templateModel->delete($id);
            return $this->success('Şablon silindi');
        } catch (\Exception $e) {
            return $this->error('Şablon silinemedi: ' . $e->getMessage());
        }
    }

    /**
     * Create transaction from template
     * POST /api/templates/:id/create-transaction
     */
    public function createTransaction(int $id)
    {
        $template = $this->templateModel->getById($id);
        if (!$template) {
            return $this->notFound('Şablon bulunamadı');
        }

        $data = $this->getJsonInput();
        $date = $data['date'] ?? date('Y-m-d');
        $userId = $data['userId'] ?? $this->getUserId();

        // Prepare transaction data from template
        $transactionData = [
            'type' => $template['type'],
            'category_id' => $template['category_id'],
            'party_id' => $template['party_id'],
            'amount' => $template['amount'] ?? 0,
            'currency' => $template['currency'],
            'vat_rate' => $template['vat_rate'],
            'withholding_rate' => $template['withholding_rate'],
            'description' => $template['description'],
            'date' => $date,
            'created_by' => $userId
        ];

        // Allow overrides from request
        if (isset($data['amount'])) {
            $transactionData['amount'] = $data['amount'];
        }
        if (isset($data['description'])) {
            $transactionData['description'] = $data['description'];
        }
        if (isset($data['party_id'])) {
            $transactionData['party_id'] = $data['party_id'];
        }
        if (isset($data['category_id'])) {
            $transactionData['category_id'] = $data['category_id'];
        }
        if (isset($data['project_id'])) {
            $transactionData['project_id'] = $data['project_id'];
        }

        // Calculate VAT and net amounts
        $grossAmount = (float)$transactionData['amount'];
        $vatRate = (float)$transactionData['vat_rate'];
        $withholdingRate = (float)$transactionData['withholding_rate'];

        $vatAmount = $grossAmount * ($vatRate / 100);
        $withholdingAmount = $grossAmount * ($withholdingRate / 100);
        $netAmount = $grossAmount + $vatAmount - $withholdingAmount;

        $transactionData['vat_amount'] = $vatAmount;
        $transactionData['withholding_amount'] = $withholdingAmount;
        $transactionData['net_amount'] = $netAmount;

        try {
            $transactionId = $this->transactionModel->insert($transactionData);

            // Update next_date if recurring
            if ($template['recurrence'] !== 'none' && $template['next_date']) {
                $this->templateModel->updateNextDate($id);
            }

            return $this->created('İşlem oluşturuldu', ['id' => $transactionId]);
        } catch (\Exception $e) {
            return $this->error('İşlem oluşturulamadı: ' . $e->getMessage());
        }
    }

    /**
     * Get templates that are due (based on next_date)
     * GET /api/templates/due
     */
    public function due()
    {
        $templates = $this->templateModel->getDue();

        return $this->success('Vadesi gelen şablonlar', ['templates' => $templates]);
    }
}
