<?php

namespace App\Controllers;

use App\Models\MilestoneModel;
use App\Models\ProjectModel;

class MilestoneController extends BaseController
{
    protected MilestoneModel $milestoneModel;
    protected ProjectModel $projectModel;

    public function __construct()
    {
        parent::__construct();
        $this->milestoneModel = new MilestoneModel();
        $this->projectModel = new ProjectModel();
    }

    /**
     * Get single milestone
     * GET /api/milestones/{id}
     */
    public function show(int $id)
    {
        $milestone = $this->milestoneModel->getWithProject($id);

        if (!$milestone) {
            return $this->notFound('Kilometre taşı bulunamadı');
        }

        return $this->success('Kilometre taşı detayı', [
            'milestone' => $milestone
        ]);
    }

    /**
     * Create milestone
     * POST /api/milestones
     */
    public function create()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['project_id', 'name']);
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
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'amount' => $data['amount'] ?? 0,
            'currency' => $data['currency'] ?? $project['currency'],
            'due_date' => $data['due_date'] ?? null,
            'status' => $data['status'] ?? 'pending',
            'completed_date' => $data['completed_date'] ?? null,
            'notes' => $data['notes'] ?? null
        ];

        $id = $this->milestoneModel->insert($insertData);
        if (!$id) {
            return $this->error('Kilometre taşı oluşturulamadı', 500);
        }

        $milestone = $this->milestoneModel->getWithProject($id);

        return $this->created('Kilometre taşı oluşturuldu', [
            'milestone' => $milestone
        ]);
    }

    /**
     * Update milestone
     * PUT /api/milestones/{id}
     */
    public function update(int $id)
    {
        $milestone = $this->milestoneModel->find($id);
        if (!$milestone) {
            return $this->notFound('Kilometre taşı bulunamadı');
        }

        $data = $this->getJsonInput();

        // Auto-set completed_date if status changed to completed
        if (isset($data['status']) && $data['status'] === 'completed' && !isset($data['completed_date'])) {
            $data['completed_date'] = date('Y-m-d');
        }

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['project_id'], $data['created_at']);

        $this->milestoneModel->update($id, $data);

        $milestone = $this->milestoneModel->getWithProject($id);

        return $this->success('Kilometre taşı güncellendi', [
            'milestone' => $milestone
        ]);
    }

    /**
     * Delete milestone
     * DELETE /api/milestones/{id}
     */
    public function delete(int $id)
    {
        $milestone = $this->milestoneModel->find($id);
        if (!$milestone) {
            return $this->notFound('Kilometre taşı bulunamadı');
        }

        // Check for related transactions
        if ($this->milestoneModel->hasRelatedRecords($id)) {
            return $this->error('Bu kilometre taşının ilişkili işlemleri var', 409);
        }

        $this->milestoneModel->delete($id);

        return $this->success('Kilometre taşı silindi');
    }
}
