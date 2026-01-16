<?php
$isEdit = !empty($milestone);
$formAction = $isEdit
    ? base_url('projects/' . $project['id'] . '/milestones/' . $milestone['id'])
    : base_url('projects/' . $project['id'] . '/milestones');
?>

<div class="max-w-xl mx-auto">
    <div class="mb-6">
        <a href="<?= base_url('projects/' . $project['id']) ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <?= esc($project['title']) ?> Projesine Dön
        </a>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6"><?= $isEdit ? 'Kilometre Taşı Düzenle' : 'Yeni Kilometre Taşı' ?></h2>

        <form action="<?= $formAction ?>" method="post">
            <?= csrf_field() ?>
            <?php if ($isEdit): ?>
            <input type="hidden" name="_method" value="PUT">
            <?php endif; ?>

            <div class="space-y-6">
                <div>
                    <label for="title" class="block text-sm font-medium text-gray-700 mb-2">Başlık *</label>
                    <input type="text" id="title" name="title" value="<?= old('title', $milestone['title'] ?? '') ?>" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Örn: İlk Ödeme, Ara Teslimat, Final">
                </div>

                <div>
                    <label for="expected_date" class="block text-sm font-medium text-gray-700 mb-2">Beklenen Tarih *</label>
                    <input type="date" id="expected_date" name="expected_date"
                           value="<?= old('expected_date', $milestone['expected_date'] ?? '') ?>" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="expected_amount" class="block text-sm font-medium text-gray-700 mb-2">Beklenen Tutar *</label>
                        <input type="number" step="0.01" id="expected_amount" name="expected_amount"
                               value="<?= old('expected_amount', $milestone['expected_amount'] ?? '') ?>" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="currency" class="block text-sm font-medium text-gray-700 mb-2">Para Birimi *</label>
                        <select id="currency" name="currency" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <?php foreach ($currencies as $code => $name): ?>
                            <option value="<?= $code ?>" <?= old('currency', $milestone['currency'] ?? $project['currency']) === $code ? 'selected' : '' ?>><?= esc($name) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div>
                    <label for="status" class="block text-sm font-medium text-gray-700 mb-2">Durum *</label>
                    <select id="status" name="status" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="pending" <?= old('status', $milestone['status'] ?? 'pending') === 'pending' ? 'selected' : '' ?>>Bekliyor</option>
                        <option value="invoiced" <?= old('status', $milestone['status'] ?? '') === 'invoiced' ? 'selected' : '' ?>>Faturalandı</option>
                        <option value="paid" <?= old('status', $milestone['status'] ?? '') === 'paid' ? 'selected' : '' ?>>Ödendi</option>
                    </select>
                </div>

                <div>
                    <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                    <textarea id="notes" name="notes" rows="3"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"><?= old('notes', $milestone['notes'] ?? '') ?></textarea>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <a href="<?= base_url('projects/' . $project['id']) ?>" class="px-4 py-2 text-gray-700 hover:text-gray-900">İptal</a>
                <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    <?= $isEdit ? 'Güncelle' : 'Kaydet' ?>
                </button>
            </div>
        </form>
    </div>
</div>
