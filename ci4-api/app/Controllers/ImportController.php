<?php

namespace App\Controllers;

use App\Models\TransactionModel;
use App\Models\PartyModel;
use App\Models\CategoryModel;

class ImportController extends BaseController
{
    protected TransactionModel $transactionModel;
    protected PartyModel $partyModel;
    protected CategoryModel $categoryModel;

    public function __construct()
    {
        parent::__construct();
        $this->transactionModel = new TransactionModel();
        $this->partyModel = new PartyModel();
        $this->categoryModel = new CategoryModel();
    }

    /**
     * Preview import data
     * POST /api/import/preview
     */
    public function preview()
    {
        $file = $this->request->getFile('file');
        if (!$file || !$file->isValid()) {
            return $this->validationError(['file' => 'Geçerli bir dosya yükleyin']);
        }

        // Check file type
        $extension = strtolower($file->getExtension());
        if (!in_array($extension, ['csv', 'xlsx', 'xls'])) {
            return $this->validationError(['file' => 'CSV veya Excel dosyası yükleyin']);
        }

        try {
            $data = $this->parseFile($file);

            return $this->success('Dosya okundu', [
                'rows' => $data,
                'count' => count($data),
                'columns' => !empty($data) ? array_keys($data[0]) : []
            ]);

        } catch (\Exception $e) {
            return $this->error('Dosya okunamadı: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Import transactions
     * POST /api/import/transactions
     */
    public function transactions()
    {
        $data = $this->getJsonInput();

        if (empty($data['rows']) || !is_array($data['rows'])) {
            return $this->validationError(['rows' => 'İçe aktarılacak veri yok']);
        }

        $mapping = $data['mapping'] ?? [];
        $imported = 0;
        $errors = [];

        foreach ($data['rows'] as $index => $row) {
            try {
                $transaction = $this->mapTransaction($row, $mapping);

                if (empty($transaction['date']) || empty($transaction['amount']) || empty($transaction['type'])) {
                    $errors[] = "Satır " . ($index + 1) . ": Zorunlu alanlar eksik";
                    continue;
                }

                // Find or create party
                if (!empty($transaction['party_name']) && empty($transaction['party_id'])) {
                    $party = $this->partyModel->where('name', $transaction['party_name'])->first();
                    if (!$party) {
                        $this->partyModel->insert([
                            'name' => $transaction['party_name'],
                            'type' => 'other',
                            'created_by' => $this->getUserId()
                        ]);
                        $transaction['party_id'] = $this->partyModel->getInsertID();
                    } else {
                        $transaction['party_id'] = $party['id'];
                    }
                }
                unset($transaction['party_name']);

                // Find or create category
                if (!empty($transaction['category_name']) && empty($transaction['category_id'])) {
                    $category = $this->categoryModel
                        ->where('name', $transaction['category_name'])
                        ->where('type', $transaction['type'])
                        ->first();
                    if (!$category) {
                        $this->categoryModel->insert([
                            'name' => $transaction['category_name'],
                            'type' => $transaction['type'],
                            'is_active' => 1,
                            'created_by' => $this->getUserId()
                        ]);
                        $transaction['category_id'] = $this->categoryModel->getInsertID();
                    } else {
                        $transaction['category_id'] = $category['id'];
                    }
                }
                unset($transaction['category_name']);

                // Calculate amounts
                $amount = (float)$transaction['amount'];
                $vatRate = (float)($transaction['vat_rate'] ?? 0);
                $withholdingRate = (float)($transaction['withholding_rate'] ?? 0);

                $transaction['vat_amount'] = $amount * ($vatRate / 100);
                $transaction['withholding_amount'] = $amount * ($withholdingRate / 100);
                $transaction['net_amount'] = $amount + $transaction['vat_amount'] - $transaction['withholding_amount'];
                $transaction['created_by'] = $this->getUserId();

                $this->transactionModel->insert($transaction);
                $imported++;

            } catch (\Exception $e) {
                $errors[] = "Satır " . ($index + 1) . ": " . $e->getMessage();
            }
        }

        return $this->success('İçe aktarma tamamlandı', [
            'imported' => $imported,
            'errors' => $errors
        ]);
    }

    /**
     * Import parties
     * POST /api/import/parties
     */
    public function parties()
    {
        $data = $this->getJsonInput();

        if (empty($data['rows']) || !is_array($data['rows'])) {
            return $this->validationError(['rows' => 'İçe aktarılacak veri yok']);
        }

        $mapping = $data['mapping'] ?? [];
        $imported = 0;
        $errors = [];

        foreach ($data['rows'] as $index => $row) {
            try {
                $party = $this->mapParty($row, $mapping);

                if (empty($party['name'])) {
                    $errors[] = "Satır " . ($index + 1) . ": İsim zorunludur";
                    continue;
                }

                // Check if exists
                if ($this->partyModel->where('name', $party['name'])->countAllResults() > 0) {
                    $errors[] = "Satır " . ($index + 1) . ": '" . $party['name'] . "' zaten mevcut";
                    continue;
                }

                $party['created_by'] = $this->getUserId();
                $this->partyModel->insert($party);
                $imported++;

            } catch (\Exception $e) {
                $errors[] = "Satır " . ($index + 1) . ": " . $e->getMessage();
            }
        }

        return $this->success('İçe aktarma tamamlandı', [
            'imported' => $imported,
            'errors' => $errors
        ]);
    }

    /**
     * Import categories
     * POST /api/import/categories
     */
    public function categories()
    {
        $data = $this->getJsonInput();

        if (empty($data['rows']) || !is_array($data['rows'])) {
            return $this->validationError(['rows' => 'İçe aktarılacak veri yok']);
        }

        $mapping = $data['mapping'] ?? [];
        $imported = 0;
        $errors = [];

        foreach ($data['rows'] as $index => $row) {
            try {
                $category = $this->mapCategory($row, $mapping);

                if (empty($category['name']) || empty($category['type'])) {
                    $errors[] = "Satır " . ($index + 1) . ": İsim ve tip zorunludur";
                    continue;
                }

                // Check if exists
                if ($this->categoryModel->where('name', $category['name'])->where('type', $category['type'])->countAllResults() > 0) {
                    $errors[] = "Satır " . ($index + 1) . ": '" . $category['name'] . "' zaten mevcut";
                    continue;
                }

                $category['created_by'] = $this->getUserId();
                $category['is_active'] = 1;
                $this->categoryModel->insert($category);
                $imported++;

            } catch (\Exception $e) {
                $errors[] = "Satır " . ($index + 1) . ": " . $e->getMessage();
            }
        }

        return $this->success('İçe aktarma tamamlandı', [
            'imported' => $imported,
            'errors' => $errors
        ]);
    }

    /**
     * Parse uploaded file
     */
    private function parseFile($file): array
    {
        $extension = strtolower($file->getExtension());
        $path = $file->getTempName();

        if ($extension === 'csv') {
            return $this->parseCsv($path);
        }

        // For Excel files, use a simple approach or external library
        return $this->parseCsv($path); // Fallback to CSV parsing
    }

    /**
     * Parse CSV file
     */
    private function parseCsv(string $path): array
    {
        $data = [];
        $headers = [];

        if (($handle = fopen($path, 'r')) !== false) {
            $row = 0;
            while (($line = fgetcsv($handle, 0, ',')) !== false) {
                if ($row === 0) {
                    // First row is headers
                    $headers = array_map('trim', $line);
                } else {
                    $item = [];
                    foreach ($headers as $i => $header) {
                        $item[$header] = isset($line[$i]) ? trim($line[$i]) : '';
                    }
                    $data[] = $item;
                }
                $row++;
            }
            fclose($handle);
        }

        return $data;
    }

    /**
     * Map row to transaction
     */
    private function mapTransaction(array $row, array $mapping): array
    {
        $transaction = [];

        $fields = ['type', 'date', 'amount', 'currency', 'vat_rate', 'withholding_rate',
            'description', 'ref_no', 'party_name', 'party_id', 'category_name', 'category_id'];

        foreach ($fields as $field) {
            $sourceField = $mapping[$field] ?? $field;
            if (isset($row[$sourceField])) {
                $transaction[$field] = $row[$sourceField];
            }
        }

        // Default values
        $transaction['currency'] = $transaction['currency'] ?? 'TRY';
        $transaction['vat_rate'] = $transaction['vat_rate'] ?? 0;
        $transaction['withholding_rate'] = $transaction['withholding_rate'] ?? 0;

        return $transaction;
    }

    /**
     * Map row to party
     */
    private function mapParty(array $row, array $mapping): array
    {
        $party = [];

        $fields = ['name', 'type', 'tax_number', 'tax_office', 'address', 'phone', 'email', 'notes'];

        foreach ($fields as $field) {
            $sourceField = $mapping[$field] ?? $field;
            if (isset($row[$sourceField])) {
                $party[$field] = $row[$sourceField];
            }
        }

        $party['type'] = $party['type'] ?? 'other';

        return $party;
    }

    /**
     * Map row to category
     */
    private function mapCategory(array $row, array $mapping): array
    {
        $category = [];

        $fields = ['name', 'type', 'description'];

        foreach ($fields as $field) {
            $sourceField = $mapping[$field] ?? $field;
            if (isset($row[$sourceField])) {
                $category[$field] = $row[$sourceField];
            }
        }

        return $category;
    }
}
