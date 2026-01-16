<?php

namespace App\Controllers;

use App\Models\ProjectModel;
use App\Models\ProjectMilestoneModel;
use App\Models\AuditLogModel;
use App\Services\CurrencyService;

class MilestoneController extends BaseController
{
    protected ProjectModel $projectModel;
    protected ProjectMilestoneModel $milestoneModel;
    protected AuditLogModel $auditLogModel;
    protected CurrencyService $currencyService;

    public function __construct()
    {
        $this->projectModel = new ProjectModel();
        $this->milestoneModel = new ProjectMilestoneModel();
        $this->auditLogModel = new AuditLogModel();
        $this->currencyService = new CurrencyService();
    }

    /**
     * Show create form
     */
    public function create(int $projectId)
    {
        $project = $this->projectModel->find($projectId);

        if (!$project) {
            return $this->redirectWithError('/projects', 'Proje bulunamadı.');
        }

        $currencies = $this->currencyService->getForDropdown();

        return $this->render('projects/milestone_form', [
            'title'      => 'Yeni Milestone',
            'project'    => $project,
            'milestone'  => null,
            'currencies' => $currencies,
            'action'     => 'create',
        ]);
    }

    /**
     * Store new milestone
     */
    public function store(int $projectId)
    {
        $project = $this->projectModel->find($projectId);

        if (!$project) {
            return $this->redirectWithError('/projects', 'Proje bulunamadı.');
        }

        $rules = [
            'title'           => 'required|min_length[2]|max_length[255]',
            'expected_amount' => 'required|decimal',
            'currency'        => 'required|max_length[3]',
            'status'          => 'required|in_list[pending,completed,cancelled]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'project_id'      => $projectId,
            'title'           => $this->request->getPost('title'),
            'expected_date'   => $this->request->getPost('expected_date') ?: null,
            'expected_amount' => $this->request->getPost('expected_amount'),
            'currency'        => $this->request->getPost('currency'),
            'status'          => $this->request->getPost('status'),
            'notes'           => $this->request->getPost('notes'),
        ];

        $id = $this->milestoneModel->insert($data);

        if ($id) {
            $this->auditLogModel->logAction('create', 'milestone', $id, null, $data);
            return $this->redirectWithSuccess('/projects/' . $projectId, 'Milestone başarıyla oluşturuldu.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Milestone oluşturulamadı.');
    }

    /**
     * Show edit form
     */
    public function edit(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/projects');
        }

        $milestone = $this->milestoneModel->find($id);

        if (!$milestone) {
            return $this->redirectWithError('/projects', 'Milestone bulunamadı.');
        }

        $project = $this->projectModel->find($milestone['project_id']);
        $currencies = $this->currencyService->getForDropdown();

        return $this->render('projects/milestone_form', [
            'title'      => 'Milestone Düzenle',
            'project'    => $project,
            'milestone'  => $milestone,
            'currencies' => $currencies,
            'action'     => 'edit',
        ]);
    }

    /**
     * Update milestone
     */
    public function update(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/projects');
        }

        $milestone = $this->milestoneModel->find($id);

        if (!$milestone) {
            return $this->redirectWithError('/projects', 'Milestone bulunamadı.');
        }

        $rules = [
            'title'           => 'required|min_length[2]|max_length[255]',
            'expected_amount' => 'required|decimal',
            'currency'        => 'required|max_length[3]',
            'status'          => 'required|in_list[pending,completed,cancelled]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'title'           => $this->request->getPost('title'),
            'expected_date'   => $this->request->getPost('expected_date') ?: null,
            'expected_amount' => $this->request->getPost('expected_amount'),
            'currency'        => $this->request->getPost('currency'),
            'status'          => $this->request->getPost('status'),
            'notes'           => $this->request->getPost('notes'),
        ];

        $oldData = $milestone;

        if ($this->milestoneModel->update($id, $data)) {
            $this->auditLogModel->logAction('update', 'milestone', $id, $oldData, $data);
            return $this->redirectWithSuccess('/projects/' . $milestone['project_id'], 'Milestone başarıyla güncellendi.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Milestone güncellenemedi.');
    }

    /**
     * Delete milestone
     */
    public function delete(int $id)
    {
        if (!$this->checkDeletePermission()) {
            return redirect()->to('/projects');
        }

        $milestone = $this->milestoneModel->find($id);

        if (!$milestone) {
            return $this->redirectWithError('/projects', 'Milestone bulunamadı.');
        }

        $projectId = $milestone['project_id'];

        if ($this->milestoneModel->delete($id)) {
            $this->auditLogModel->logAction('delete', 'milestone', $id, $milestone, null);
            return $this->redirectWithSuccess('/projects/' . $projectId, 'Milestone başarıyla silindi.');
        }

        return $this->redirectWithError('/projects/' . $projectId, 'Milestone silinemedi.');
    }
}
