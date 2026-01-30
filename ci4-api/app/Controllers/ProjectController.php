<?php

namespace App\Controllers;

use App\Models\ProjectModel;
use App\Models\MilestoneModel;
use App\Models\GrantModel;

class ProjectController extends BaseController
{
    protected ProjectModel $projectModel;
    protected MilestoneModel $milestoneModel;
    protected GrantModel $grantModel;

    public function __construct()
    {
        parent::__construct();
        $this->projectModel = new ProjectModel();
        $this->milestoneModel = new MilestoneModel();
        $this->grantModel = new GrantModel();
    }

    /**
     * List projects
     * GET /api/projects
     */
    public function index()
    {
        $status = $this->getQueryParam('status');
        $projects = $this->projectModel->getAll($status);

        return $this->success('Projeler listelendi', [
            'projects' => $projects,
            'count' => count($projects)
        ]);
    }

    /**
     * Get single project
     * GET /api/projects/{id}
     */
    public function show(int $id)
    {
        $project = $this->projectModel->getWithDetails($id);

        if (!$project) {
            return $this->notFound('Proje bulunamadı');
        }

        return $this->success('Proje detayı', [
            'project' => $project
        ]);
    }

    /**
     * Create project
     * POST /api/projects
     */
    public function create()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['title', 'currency']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        $insertData = [
            'title' => $data['title'],
            'party_id' => !empty($data['party_id']) ? $data['party_id'] : null,
            'start_date' => !empty($data['start_date']) ? $data['start_date'] : null,
            'end_date' => !empty($data['end_date']) ? $data['end_date'] : null,
            'contract_amount' => $data['contract_amount'] ?? 0,
            'currency' => $data['currency'],
            'status' => $data['status'] ?? 'active',
            'notes' => !empty($data['notes']) ? $data['notes'] : null
        ];

        $id = $this->projectModel->insert($insertData);
        if (!$id) {
            return $this->error('Proje oluşturulamadı', 500);
        }

        // Create milestones if provided
        if (!empty($data['milestones']) && is_array($data['milestones'])) {
            foreach ($data['milestones'] as $milestone) {
                $this->milestoneModel->insert([
                    'project_id' => $id,
                    'title' => $milestone['title'] ?? $milestone['name'] ?? '',
                    'expected_date' => $milestone['expected_date'] ?? $milestone['due_date'] ?? null,
                    'expected_amount' => $milestone['expected_amount'] ?? $milestone['amount'] ?? 0,
                    'currency' => $milestone['currency'] ?? $data['currency'],
                    'status' => 'pending',
                    'notes' => $milestone['notes'] ?? null
                ]);
            }
        }

        $project = $this->projectModel->getWithDetails($id);

        return $this->created('Proje oluşturuldu', [
            'project' => $project
        ]);
    }

    /**
     * Update project
     * PUT /api/projects/{id}
     */
    public function update(int $id)
    {
        $project = $this->projectModel->find($id);
        if (!$project) {
            return $this->notFound('Proje bulunamadı');
        }

        $data = $this->getJsonInput();

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at'], $data['created_by'], $data['milestones'], $data['grants']);

        $this->projectModel->update($id, $data);

        $project = $this->projectModel->getWithDetails($id);

        return $this->success('Proje güncellendi', [
            'project' => $project
        ]);
    }

    /**
     * Delete project
     * DELETE /api/projects/{id}
     */
    public function delete(int $id)
    {
        $project = $this->projectModel->find($id);
        if (!$project) {
            return $this->notFound('Proje bulunamadı');
        }

        // Unassign transactions from this project (set project_id to NULL)
        $this->projectModel->unassignTransactions($id);

        // Delete milestones
        $this->milestoneModel->where('project_id', $id)->chainDelete();

        // Delete grants
        $this->grantModel->where('project_id', $id)->chainDelete();

        $this->projectModel->delete($id);

        return $this->success('Proje silindi');
    }

    /**
     * Get incomplete project count
     * GET /api/projects/incomplete-count
     */
    public function incompleteCount()
    {
        $count = $this->projectModel->getIncompleteCount();

        return $this->success('Tamamlanmamış proje sayısı', [
            'count' => $count
        ]);
    }
}
