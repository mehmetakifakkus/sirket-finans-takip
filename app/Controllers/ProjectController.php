<?php

namespace App\Controllers;

use App\Models\ProjectModel;
use App\Models\ProjectMilestoneModel;
use App\Models\PartyModel;
use App\Models\TransactionModel;
use App\Models\AuditLogModel;
use App\Services\CurrencyService;

class ProjectController extends BaseController
{
    protected ProjectModel $projectModel;
    protected ProjectMilestoneModel $milestoneModel;
    protected PartyModel $partyModel;
    protected TransactionModel $transactionModel;
    protected AuditLogModel $auditLogModel;
    protected CurrencyService $currencyService;

    public function __construct()
    {
        $this->projectModel = new ProjectModel();
        $this->milestoneModel = new ProjectMilestoneModel();
        $this->partyModel = new PartyModel();
        $this->transactionModel = new TransactionModel();
        $this->auditLogModel = new AuditLogModel();
        $this->currencyService = new CurrencyService();
    }

    /**
     * List all projects
     */
    public function index()
    {
        $status = $this->request->getGet('status');

        $builder = $this->projectModel
            ->select('projects.*, parties.name as party_name')
            ->join('parties', 'parties.id = projects.party_id', 'left');

        if ($status) {
            $builder->where('projects.status', $status);
        }

        $projects = $builder->orderBy('projects.created_at', 'DESC')->findAll();

        // Add balance info to each project
        foreach ($projects as &$project) {
            $project['balance'] = $this->projectModel->calculateBalance($project['id']);
        }

        return $this->render('projects/index', [
            'title'         => 'Projeler',
            'projects'      => $projects,
            'currentStatus' => $status,
        ]);
    }

    /**
     * Show project details
     */
    public function show(int $id)
    {
        $project = $this->projectModel->getWithPartyById($id);

        if (!$project) {
            return $this->redirectWithError('/projects', 'Proje bulunamadı.');
        }

        // Get milestones
        $milestones = $this->milestoneModel->getByProject($id);

        // Get transactions
        $transactions = $this->transactionModel
            ->where('project_id', $id)
            ->orderBy('date', 'DESC')
            ->findAll();

        // Calculate balance
        $balance = $this->projectModel->calculateBalance($id);

        return $this->render('projects/show', [
            'title'        => $project['title'],
            'project'      => $project,
            'milestones'   => $milestones,
            'transactions' => $transactions,
            'balance'      => $balance,
        ]);
    }

    /**
     * Show create form
     */
    public function create()
    {
        $parties = $this->partyModel->getCustomers();
        $currencies = $this->currencyService->getForDropdown();

        return $this->render('projects/form', [
            'title'      => 'Yeni Proje',
            'project'    => null,
            'parties'    => $parties,
            'currencies' => $currencies,
            'action'     => 'create',
        ]);
    }

    /**
     * Store new project
     */
    public function store()
    {
        $rules = [
            'party_id'        => 'required|integer',
            'title'           => 'required|min_length[2]|max_length[255]',
            'contract_amount' => 'required|decimal',
            'currency'        => 'required|max_length[3]',
            'status'          => 'required|in_list[active,completed,cancelled,on_hold]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'party_id'        => $this->request->getPost('party_id'),
            'title'           => $this->request->getPost('title'),
            'contract_amount' => $this->request->getPost('contract_amount'),
            'currency'        => $this->request->getPost('currency'),
            'start_date'      => $this->request->getPost('start_date') ?: null,
            'end_date'        => $this->request->getPost('end_date') ?: null,
            'status'          => $this->request->getPost('status'),
            'notes'           => $this->request->getPost('notes'),
        ];

        $id = $this->projectModel->insert($data);

        if ($id) {
            $this->auditLogModel->logAction('create', 'project', $id, null, $data);
            return $this->redirectWithSuccess('/projects/' . $id, 'Proje başarıyla oluşturuldu.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Proje oluşturulamadı.');
    }

    /**
     * Show edit form
     */
    public function edit(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/projects');
        }

        $project = $this->projectModel->find($id);

        if (!$project) {
            return $this->redirectWithError('/projects', 'Proje bulunamadı.');
        }

        $parties = $this->partyModel->getCustomers();
        $currencies = $this->currencyService->getForDropdown();

        return $this->render('projects/form', [
            'title'      => 'Proje Düzenle',
            'project'    => $project,
            'parties'    => $parties,
            'currencies' => $currencies,
            'action'     => 'edit',
        ]);
    }

    /**
     * Update project
     */
    public function update(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/projects');
        }

        $project = $this->projectModel->find($id);

        if (!$project) {
            return $this->redirectWithError('/projects', 'Proje bulunamadı.');
        }

        $rules = [
            'party_id'        => 'required|integer',
            'title'           => 'required|min_length[2]|max_length[255]',
            'contract_amount' => 'required|decimal',
            'currency'        => 'required|max_length[3]',
            'status'          => 'required|in_list[active,completed,cancelled,on_hold]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'party_id'        => $this->request->getPost('party_id'),
            'title'           => $this->request->getPost('title'),
            'contract_amount' => $this->request->getPost('contract_amount'),
            'currency'        => $this->request->getPost('currency'),
            'start_date'      => $this->request->getPost('start_date') ?: null,
            'end_date'        => $this->request->getPost('end_date') ?: null,
            'status'          => $this->request->getPost('status'),
            'notes'           => $this->request->getPost('notes'),
        ];

        $oldData = $project;

        if ($this->projectModel->update($id, $data)) {
            $this->auditLogModel->logAction('update', 'project', $id, $oldData, $data);
            return $this->redirectWithSuccess('/projects/' . $id, 'Proje başarıyla güncellendi.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Proje güncellenemedi.');
    }

    /**
     * Delete project
     */
    public function delete(int $id)
    {
        if (!$this->checkDeletePermission()) {
            return redirect()->to('/projects');
        }

        $project = $this->projectModel->find($id);

        if (!$project) {
            return $this->redirectWithError('/projects', 'Proje bulunamadı.');
        }

        if ($this->projectModel->delete($id)) {
            $this->auditLogModel->logAction('delete', 'project', $id, $project, null);
            return $this->redirectWithSuccess('/projects', 'Proje başarıyla silindi.');
        }

        return $this->redirectWithError('/projects', 'Proje silinemedi.');
    }
}
