<?php

namespace App\Controllers;

use App\Models\PartyModel;

class PartyController extends BaseController
{
    protected PartyModel $partyModel;

    public function __construct()
    {
        parent::__construct();
        $this->partyModel = new PartyModel();
    }

    /**
     * List parties
     * GET /api/parties
     */
    public function index()
    {
        $type = $this->getQueryParam('type');
        $parties = $this->partyModel->getWithStats($type);

        return $this->success('Taraflar listelendi', [
            'parties' => $parties,
            'count' => count($parties)
        ]);
    }

    /**
     * Get single party
     * GET /api/parties/{id}
     */
    public function show(int $id)
    {
        $party = $this->partyModel->getWithDetails($id);

        if (!$party) {
            return $this->notFound('Taraf bulunamadı');
        }

        return $this->success('Taraf detayı', [
            'party' => $party
        ]);
    }

    /**
     * Create party
     * POST /api/parties
     */
    public function create()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['name', 'type']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        $insertData = [
            'name' => $data['name'],
            'type' => $data['type'],
            'tax_number' => $data['tax_number'] ?? null,
            'tax_office' => $data['tax_office'] ?? null,
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $this->getUserId()
        ];

        $id = $this->partyModel->insert($insertData);
        if (!$id) {
            return $this->error('Taraf oluşturulamadı', 500);
        }

        $party = $this->partyModel->getWithDetails($id);

        return $this->created('Taraf oluşturuldu', [
            'party' => $party
        ]);
    }

    /**
     * Update party
     * PUT /api/parties/{id}
     */
    public function update(int $id)
    {
        $party = $this->partyModel->find($id);
        if (!$party) {
            return $this->notFound('Taraf bulunamadı');
        }

        $data = $this->getJsonInput();

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at'], $data['created_by']);

        $this->partyModel->update($id, $data);

        $party = $this->partyModel->getWithDetails($id);

        return $this->success('Taraf güncellendi', [
            'party' => $party
        ]);
    }

    /**
     * Delete party
     * DELETE /api/parties/{id}
     */
    public function delete(int $id)
    {
        $party = $this->partyModel->find($id);
        if (!$party) {
            return $this->notFound('Taraf bulunamadı');
        }

        // Check for related records
        if ($this->partyModel->hasRelatedRecords($id)) {
            return $this->error('Bu tarafın ilişkili işlemleri veya borçları var. Önce bunları silin veya başka bir tarafa aktarın.', 409);
        }

        $this->partyModel->delete($id);

        return $this->success('Taraf silindi');
    }

    /**
     * Merge parties
     * POST /api/parties/merge
     */
    public function merge()
    {
        $data = $this->getJsonInput();

        if (empty($data['source_id']) || empty($data['target_id'])) {
            return $this->validationError(['message' => 'source_id ve target_id zorunludur']);
        }

        $sourceId = (int)$data['source_id'];
        $targetId = (int)$data['target_id'];

        if ($sourceId === $targetId) {
            return $this->error('Kaynak ve hedef taraf aynı olamaz');
        }

        $source = $this->partyModel->find($sourceId);
        $target = $this->partyModel->find($targetId);

        if (!$source || !$target) {
            return $this->notFound('Kaynak veya hedef taraf bulunamadı');
        }

        $success = $this->partyModel->mergeParties($sourceId, $targetId);

        if (!$success) {
            return $this->error('Taraflar birleştirilemedi', 500);
        }

        $party = $this->partyModel->getWithDetails($targetId);

        return $this->success('Taraflar birleştirildi', [
            'party' => $party
        ]);
    }
}
