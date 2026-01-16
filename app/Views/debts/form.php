<?php
$isEdit = !empty($debt);
$formAction = $isEdit ? base_url('debts/' . $debt['id']) : base_url('debts');
?>

<div class="max-w-2xl mx-auto">
    <div class="mb-6">
        <a href="<?= base_url('debts') ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Geri
        </a>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form action="<?= $formAction ?>" method="post">
            <?= csrf_field() ?>
            <?php if ($isEdit): ?>
            <input type="hidden" name="_method" value="PUT">
            <?php endif; ?>
            <input type="hidden" name="kind" value="<?= esc($kind) ?>">

            <div class="space-y-6">
                <!-- Type Badge -->
                <div class="flex items-center">
                    <span class="px-3 py-1 text-sm font-medium rounded-full <?= $kind === 'debt' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800' ?>">
                        <?= $kind === 'debt' ? 'Borç Kaydı' : 'Alacak Kaydı' ?>
                    </span>
                </div>

                <div>
                    <label for="party_id" class="block text-sm font-medium text-gray-700 mb-2">Taraf *</label>
                    <select id="party_id" name="party_id" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Seçiniz</option>
                        <?php foreach ($parties as $id => $name): ?>
                        <option value="<?= $id ?>" <?= old('party_id', $debt['party_id'] ?? '') == $id ? 'selected' : '' ?>><?= esc($name) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="principal_amount" class="block text-sm font-medium text-gray-700 mb-2">Anapara *</label>
                        <input type="number" step="0.01" id="principal_amount" name="principal_amount" value="<?= old('principal_amount', $debt['principal_amount'] ?? '') ?>" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="currency" class="block text-sm font-medium text-gray-700 mb-2">Para Birimi *</label>
                        <select id="currency" name="currency" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <?php foreach ($currencies as $code => $name): ?>
                            <option value="<?= $code ?>" <?= old('currency', $debt['currency'] ?? 'TRY') === $code ? 'selected' : '' ?>><?= esc($name) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label for="vat_rate" class="block text-sm font-medium text-gray-700 mb-2">KDV (%)</label>
                        <input type="number" step="0.01" id="vat_rate" name="vat_rate" value="<?= old('vat_rate', $debt['vat_rate'] ?? 0) ?>"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="start_date" class="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                        <input type="date" id="start_date" name="start_date" value="<?= old('start_date', $debt['start_date'] ?? date('Y-m-d')) ?>"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="due_date" class="block text-sm font-medium text-gray-700 mb-2">Vade Tarihi</label>
                        <input type="date" id="due_date" name="due_date" value="<?= old('due_date', $debt['due_date'] ?? '') ?>"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                </div>

                <div>
                    <label for="status" class="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                    <select id="status" name="status" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="open" <?= old('status', $debt['status'] ?? 'open') === 'open' ? 'selected' : '' ?>>Açık</option>
                        <option value="closed" <?= old('status', $debt['status'] ?? '') === 'closed' ? 'selected' : '' ?>>Kapalı</option>
                    </select>
                </div>

                <?php if (!$isEdit): ?>
                <div class="p-4 bg-blue-50 rounded-lg">
                    <label for="installment_count" class="block text-sm font-medium text-blue-800 mb-2">Otomatik Taksit Oluştur</label>
                    <input type="number" id="installment_count" name="installment_count" min="0" max="60" value="0"
                           class="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <p class="text-xs text-blue-600 mt-1">0 = taksit oluşturma</p>
                </div>
                <?php endif; ?>

                <div>
                    <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                    <textarea id="notes" name="notes" rows="3"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"><?= old('notes', $debt['notes'] ?? '') ?></textarea>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <a href="<?= base_url('debts') ?>" class="px-4 py-2 text-gray-700 hover:text-gray-900">İptal</a>
                <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    <?= $isEdit ? 'Güncelle' : 'Kaydet' ?>
                </button>
            </div>
        </form>
    </div>
</div>
