<?php
$isEdit = !empty($transaction);
$formAction = $isEdit ? base_url('transactions/' . $transaction['id']) : base_url('transactions');
?>

<div class="max-w-3xl mx-auto">
    <div class="mb-6">
        <a href="<?= base_url('transactions') ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Geri
        </a>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form action="<?= $formAction ?>" method="post" enctype="multipart/form-data">
            <?= csrf_field() ?>
            <?php if ($isEdit): ?>
            <input type="hidden" name="_method" value="PUT">
            <?php endif; ?>
            <input type="hidden" name="type" value="<?= esc($type) ?>">

            <div class="space-y-6">
                <!-- Type Badge -->
                <div class="flex items-center">
                    <span class="px-3 py-1 text-sm font-medium rounded-full <?= $type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' ?>">
                        <?= $type === 'income' ? 'Gelir Kaydı' : 'Gider Kaydı' ?>
                    </span>
                </div>

                <!-- Date and Amount -->
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label for="date" class="block text-sm font-medium text-gray-700 mb-2">Tarih *</label>
                        <input type="date" id="date" name="date" value="<?= old('date', $transaction['date'] ?? date('Y-m-d')) ?>" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="amount" class="block text-sm font-medium text-gray-700 mb-2">Tutar *</label>
                        <input type="number" step="0.01" id="amount" name="amount" value="<?= old('amount', $transaction['amount'] ?? '') ?>" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="currency" class="block text-sm font-medium text-gray-700 mb-2">Para Birimi *</label>
                        <select id="currency" name="currency" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <?php foreach ($currencies as $code => $name): ?>
                            <option value="<?= $code ?>" <?= old('currency', $transaction['currency'] ?? 'TRY') === $code ? 'selected' : '' ?>><?= esc($name) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <!-- VAT and Withholding -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="vat_rate" class="block text-sm font-medium text-gray-700 mb-2">KDV Oranı (%)</label>
                        <select id="vat_rate" name="vat_rate"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="0" <?= old('vat_rate', $transaction['vat_rate'] ?? 0) == 0 ? 'selected' : '' ?>>%0</option>
                            <option value="1" <?= old('vat_rate', $transaction['vat_rate'] ?? 0) == 1 ? 'selected' : '' ?>>%1</option>
                            <option value="10" <?= old('vat_rate', $transaction['vat_rate'] ?? 0) == 10 ? 'selected' : '' ?>>%10</option>
                            <option value="20" <?= old('vat_rate', $transaction['vat_rate'] ?? 0) == 20 ? 'selected' : '' ?>>%20</option>
                        </select>
                    </div>
                    <?php if ($type === 'income'): ?>
                    <div>
                        <label for="withholding_rate" class="block text-sm font-medium text-gray-700 mb-2">Stopaj Oranı (%)</label>
                        <select id="withholding_rate" name="withholding_rate"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="0" <?= old('withholding_rate', $transaction['withholding_rate'] ?? 0) == 0 ? 'selected' : '' ?>>%0</option>
                            <option value="3" <?= old('withholding_rate', $transaction['withholding_rate'] ?? 0) == 3 ? 'selected' : '' ?>>%3</option>
                            <option value="5" <?= old('withholding_rate', $transaction['withholding_rate'] ?? 0) == 5 ? 'selected' : '' ?>>%5</option>
                            <option value="10" <?= old('withholding_rate', $transaction['withholding_rate'] ?? 0) == 10 ? 'selected' : '' ?>>%10</option>
                            <option value="15" <?= old('withholding_rate', $transaction['withholding_rate'] ?? 0) == 15 ? 'selected' : '' ?>>%15</option>
                            <option value="20" <?= old('withholding_rate', $transaction['withholding_rate'] ?? 0) == 20 ? 'selected' : '' ?>>%20</option>
                        </select>
                    </div>
                    <?php endif; ?>
                </div>

                <!-- Category and Party -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="category_id" class="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                        <select id="category_id" name="category_id"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Seçiniz</option>
                            <?php foreach ($categories as $id => $name): ?>
                            <option value="<?= $id ?>" <?= old('category_id', $transaction['category_id'] ?? '') == $id ? 'selected' : '' ?>><?= esc($name) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div>
                        <label for="party_id" class="block text-sm font-medium text-gray-700 mb-2">Taraf</label>
                        <select id="party_id" name="party_id"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Seçiniz</option>
                            <?php foreach ($parties as $id => $name): ?>
                            <option value="<?= $id ?>" <?= old('party_id', $transaction['party_id'] ?? '') == $id ? 'selected' : '' ?>><?= esc($name) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <!-- Project -->
                <div>
                    <label for="project_id" class="block text-sm font-medium text-gray-700 mb-2">Proje</label>
                    <select id="project_id" name="project_id"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Seçiniz</option>
                        <?php foreach ($projects as $id => $name): ?>
                        <option value="<?= $id ?>" <?= old('project_id', $transaction['project_id'] ?? '') == $id ? 'selected' : '' ?>><?= esc($name) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- Description and Ref No -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="ref_no" class="block text-sm font-medium text-gray-700 mb-2">Belge No</label>
                        <input type="text" id="ref_no" name="ref_no" value="<?= old('ref_no', $transaction['ref_no'] ?? '') ?>"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="document" class="block text-sm font-medium text-gray-700 mb-2">Belge (PDF, Resim)</label>
                        <input type="file" id="document" name="document" accept=".pdf,.jpg,.jpeg,.png"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <?php if (!empty($transaction['document_path'])): ?>
                        <p class="mt-1 text-xs text-gray-500">Mevcut belge: <?= esc(basename($transaction['document_path'])) ?></p>
                        <?php endif; ?>
                    </div>
                </div>

                <div>
                    <label for="description" class="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                    <textarea id="description" name="description" rows="3"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"><?= old('description', $transaction['description'] ?? '') ?></textarea>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <a href="<?= base_url('transactions') ?>" class="px-4 py-2 text-gray-700 hover:text-gray-900">İptal</a>
                <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    <?= $isEdit ? 'Güncelle' : 'Kaydet' ?>
                </button>
            </div>
        </form>
    </div>
</div>
