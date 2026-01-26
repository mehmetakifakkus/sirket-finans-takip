<?php

namespace App\Controllers;

use App\Models\GrantModel;
use App\Models\ProjectModel;

class GrantController extends BaseController
{
    protected GrantModel $grantModel;
    protected ProjectModel $projectModel;

    public function __construct()
    {
        parent::__construct();
        $this->grantModel = new GrantModel();
        $this->projectModel = new ProjectModel();
    }

    /**
     * List grants
     * GET /api/grants
     */
    public function index()
    {
        $source = $this->getQueryParam('source');
        $grants = $this->grantModel->getAll($source);

        return $this->success('Hibeler listelendi', [
            'grants' => $grants,
            'count' => count($grants)
        ]);
    }

    /**
     * Get single grant
     * GET /api/grants/{id}
     */
    public function show(int $id)
    {
        $grant = $this->grantModel->getWithProject($id);

        if (!$grant) {
            return $this->notFound('Hibe bulunamadı');
        }

        return $this->success('Hibe detayı', [
            'grant' => $grant
        ]);
    }

    /**
     * Create grant
     * POST /api/grants
     */
    public function create()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['project_id', 'source', 'name', 'rate']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        // Check project exists
        $project = $this->projectModel->find($data['project_id']);
        if (!$project) {
            return $this->notFound('Proje bulunamadı');
        }

        $insertData = [
            'project_id' => $data['project_id'],
            'source' => $data['source'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'rate' => (float)$data['rate'],
            'max_amount' => $data['max_amount'] ?? 0,
            'currency' => $data['currency'] ?? $project['currency'],
            'calculated_amount' => 0,
            'received_amount' => $data['received_amount'] ?? 0,
            'status' => $data['status'] ?? 'pending',
            'notes' => $data['notes'] ?? null
        ];

        $id = $this->grantModel->insert($insertData);
        if (!$id) {
            return $this->error('Hibe oluşturulamadı', 500);
        }

        // Calculate initial amount
        $calculatedAmount = $this->grantModel->calculateAmount($id);
        $this->grantModel->update($id, ['calculated_amount' => $calculatedAmount]);

        $grant = $this->grantModel->getWithProject($id);

        return $this->created('Hibe oluşturuldu', [
            'grant' => $grant
        ]);
    }

    /**
     * Update grant
     * PUT /api/grants/{id}
     */
    public function update(int $id)
    {
        $grant = $this->grantModel->find($id);
        if (!$grant) {
            return $this->notFound('Hibe bulunamadı');
        }

        $data = $this->getJsonInput();

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['project_id'], $data['created_at']);

        $this->grantModel->update($id, $data);

        // Recalculate if rate changed
        if (isset($data['rate']) || isset($data['max_amount'])) {
            $calculatedAmount = $this->grantModel->calculateAmount($id);
            $this->grantModel->update($id, ['calculated_amount' => $calculatedAmount]);
        }

        $grant = $this->grantModel->getWithProject($id);

        return $this->success('Hibe güncellendi', [
            'grant' => $grant
        ]);
    }

    /**
     * Delete grant
     * DELETE /api/grants/{id}
     */
    public function delete(int $id)
    {
        $grant = $this->grantModel->find($id);
        if (!$grant) {
            return $this->notFound('Hibe bulunamadı');
        }

        $this->grantModel->delete($id);

        return $this->success('Hibe silindi');
    }

    /**
     * Calculate grant amount
     * POST /api/grants/calculate
     */
    public function calculate()
    {
        $data = $this->getJsonInput();

        if (empty($data['grant_id'])) {
            return $this->validationError(['message' => 'grant_id zorunludur']);
        }

        $grant = $this->grantModel->find($data['grant_id']);
        if (!$grant) {
            return $this->notFound('Hibe bulunamadı');
        }

        $calculatedAmount = $this->grantModel->calculateAmount($data['grant_id']);
        $this->grantModel->update($data['grant_id'], ['calculated_amount' => $calculatedAmount]);

        $grant = $this->grantModel->getWithProject($data['grant_id']);

        return $this->success('Hibe tutarı hesaplandı', [
            'grant' => $grant
        ]);
    }

    /**
     * Get grant totals by source
     * GET /api/grants/totals
     */
    public function totals()
    {
        $totals = $this->grantModel->getTotals();

        return $this->success('Hibe toplamları', [
            'totals' => $totals
        ]);
    }
}
