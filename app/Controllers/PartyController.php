<?php

namespace App\Controllers;

use App\Models\PartyModel;
use App\Models\AuditLogModel;

class PartyController extends BaseController
{
    protected PartyModel $partyModel;
    protected AuditLogModel $auditLogModel;

    public function __construct()
    {
        $this->partyModel = new PartyModel();
        $this->auditLogModel = new AuditLogModel();
    }

    /**
     * List all parties
     */
    public function index()
    {
        $type = $this->request->getGet('type');

        if ($type) {
            $parties = $this->partyModel->getByType($type);
        } else {
            $parties = $this->partyModel->orderBy('type', 'ASC')->orderBy('name', 'ASC')->findAll();
        }

        return $this->render('parties/index', [
            'title'       => 'Taraflar',
            'parties'     => $parties,
            'currentType' => $type,
        ]);
    }

    /**
     * Show party details
     */
    public function show(int $id)
    {
        $party = $this->partyModel->getWithTransactionCount($id);

        if (!$party) {
            return $this->redirectWithError('/parties', 'Taraf bulunamadı.');
        }

        return $this->render('parties/show', [
            'title' => $party['name'],
            'party' => $party,
        ]);
    }

    /**
     * Show create form
     */
    public function create()
    {
        return $this->render('parties/form', [
            'title'  => 'Yeni Taraf',
            'party'  => null,
            'action' => 'create',
        ]);
    }

    /**
     * Store new party
     */
    public function store()
    {
        $rules = [
            'type'  => 'required|in_list[customer,vendor,other]',
            'name'  => 'required|min_length[2]|max_length[255]',
            'email' => 'permit_empty|valid_email',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'type'    => $this->request->getPost('type'),
            'name'    => $this->request->getPost('name'),
            'tax_no'  => $this->request->getPost('tax_no'),
            'phone'   => $this->request->getPost('phone'),
            'email'   => $this->request->getPost('email'),
            'address' => $this->request->getPost('address'),
            'notes'   => $this->request->getPost('notes'),
        ];

        $id = $this->partyModel->insert($data);

        if ($id) {
            $this->auditLogModel->logAction('create', 'party', $id, null, $data);
            return $this->redirectWithSuccess('/parties', 'Taraf başarıyla oluşturuldu.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Taraf oluşturulamadı.');
    }

    /**
     * Show edit form
     */
    public function edit(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/parties');
        }

        $party = $this->partyModel->find($id);

        if (!$party) {
            return $this->redirectWithError('/parties', 'Taraf bulunamadı.');
        }

        return $this->render('parties/form', [
            'title'  => 'Taraf Düzenle',
            'party'  => $party,
            'action' => 'edit',
        ]);
    }

    /**
     * Update party
     */
    public function update(int $id)
    {
        if (!$this->checkEditPermission()) {
            return redirect()->to('/parties');
        }

        $party = $this->partyModel->find($id);

        if (!$party) {
            return $this->redirectWithError('/parties', 'Taraf bulunamadı.');
        }

        $rules = [
            'type'  => 'required|in_list[customer,vendor,other]',
            'name'  => 'required|min_length[2]|max_length[255]',
            'email' => 'permit_empty|valid_email',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'type'    => $this->request->getPost('type'),
            'name'    => $this->request->getPost('name'),
            'tax_no'  => $this->request->getPost('tax_no'),
            'phone'   => $this->request->getPost('phone'),
            'email'   => $this->request->getPost('email'),
            'address' => $this->request->getPost('address'),
            'notes'   => $this->request->getPost('notes'),
        ];

        $oldData = $party;

        if ($this->partyModel->update($id, $data)) {
            $this->auditLogModel->logAction('update', 'party', $id, $oldData, $data);
            return $this->redirectWithSuccess('/parties', 'Taraf başarıyla güncellendi.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Taraf güncellenemedi.');
    }

    /**
     * Delete party
     */
    public function delete(int $id)
    {
        if (!$this->checkDeletePermission()) {
            return redirect()->to('/parties');
        }

        $party = $this->partyModel->find($id);

        if (!$party) {
            return $this->redirectWithError('/parties', 'Taraf bulunamadı.');
        }

        if ($this->partyModel->delete($id)) {
            $this->auditLogModel->logAction('delete', 'party', $id, $party, null);
            return $this->redirectWithSuccess('/parties', 'Taraf başarıyla silindi.');
        }

        return $this->redirectWithError('/parties', 'Taraf silinemedi.');
    }
}
