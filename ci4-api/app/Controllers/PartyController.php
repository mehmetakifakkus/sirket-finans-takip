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
     * Get grant defaults for a party type
     */
    private function getGrantDefaults(string $type): array
    {
        return match($type) {
            'tubitak' => ['grant_rate' => 0.75, 'grant_limit' => 2333000, 'vat_included' => 0],
            'kosgeb' => ['grant_rate' => 0.80, 'grant_limit' => 1456000, 'vat_included' => 0],
            'individual' => ['grant_rate' => 1.00, 'grant_limit' => null, 'vat_included' => 1],
            default => ['grant_rate' => null, 'grant_limit' => null, 'vat_included' => 1]
        };
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

        // Get grant defaults based on type
        $grantDefaults = $this->getGrantDefaults($data['type']);

        $insertData = [
            'name' => $data['name'],
            'type' => $data['type'],
            'tax_no' => $data['tax_no'] ?? $data['tax_number'] ?? null,
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'notes' => $data['notes'] ?? null,
            'grant_rate' => $data['grant_rate'] ?? $grantDefaults['grant_rate'],
            'grant_limit' => $data['grant_limit'] ?? $grantDefaults['grant_limit'],
            'vat_included' => $data['vat_included'] ?? $grantDefaults['vat_included']
        ];

        try {
            $id = $this->partyModel->insert($insertData);
            if (!$id) {
                return $this->error('Taraf oluşturulamadı', 500);
            }

            $party = $this->partyModel->getWithDetails($id);

            return $this->created('Taraf oluşturuldu', [
                'party' => $party
            ]);
        } catch (\Exception $e) {
            return $this->error('Veritabanı hatası: ' . $e->getMessage(), 500);
        }
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

    /**
     * Get remaining grant for a party
     * GET /api/parties/{id}/remaining-grant
     */
    public function remainingGrant(int $id)
    {
        $party = $this->partyModel->find($id);
        if (!$party) {
            return $this->notFound('Taraf bulunamadı');
        }

        $remainingGrant = $this->partyModel->getRemainingGrant($id);

        return $this->success('Kalan hibe tutarı', [
            'party_id' => $id,
            'grant_limit' => $party['grant_limit'],
            'grant_rate' => $party['grant_rate'],
            'vat_included' => $party['vat_included'],
            'remaining_grant' => $remainingGrant
        ]);
    }

    /**
     * Get grant defaults for a party type
     * GET /api/parties/grant-defaults/{type}
     */
    public function grantDefaults(string $type)
    {
        $defaults = $this->getGrantDefaults($type);

        return $this->success('Hibe varsayılanları', [
            'type' => $type,
            'defaults' => $defaults
        ]);
    }
}
