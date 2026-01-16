<?php
$isEdit = !empty($project);
$formAction = $isEdit ? base_url('projects/' . $project['id']) : base_url('projects');
?>

<div class="max-w-2xl mx-auto">
    <div class="mb-6">
        <a href="<?= base_url('projects') ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
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

            <div class="space-y-6">
                <div>
                    <label for="title" class="block text-sm font-medium text-gray-700 mb-2">Proje Adı *</label>
                    <input type="text" id="title" name="title" value="<?= old('title', $project['title'] ?? '') ?>" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div>
                    <label for="party_id" class="block text-sm font-medium text-gray-700 mb-2">Müşteri</label>
                    <select id="party_id" name="party_id"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Seçiniz</option>
                        <?php foreach ($parties as $party): ?>
                        <option value="<?= $party['id'] ?>" <?= old('party_id', $project['party_id'] ?? '') == $party['id'] ? 'selected' : '' ?>>
                            <?= esc($party['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="contract_amount" class="block text-sm font-medium text-gray-700 mb-2">Sözleşme Tutarı *</label>
                        <input type="number" step="0.01" id="contract_amount" name="contract_amount"
                               value="<?= old('contract_amount', $project['contract_amount'] ?? '') ?>" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="currency" class="block text-sm font-medium text-gray-700 mb-2">Para Birimi *</label>
                        <select id="currency" name="currency" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <?php foreach ($currencies as $code => $name): ?>
                            <option value="<?= $code ?>" <?= old('currency', $project['currency'] ?? 'TRY') === $code ? 'selected' : '' ?>><?= esc($name) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="start_date" class="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                        <input type="date" id="start_date" name="start_date" value="<?= old('start_date', $project['start_date'] ?? '') ?>"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="end_date" class="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                        <input type="date" id="end_date" name="end_date" value="<?= old('end_date', $project['end_date'] ?? '') ?>"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                </div>

                <div>
                    <label for="status" class="block text-sm font-medium text-gray-700 mb-2">Durum *</label>
                    <select id="status" name="status" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="active" <?= old('status', $project['status'] ?? 'active') === 'active' ? 'selected' : '' ?>>Aktif</option>
                        <option value="on_hold" <?= old('status', $project['status'] ?? '') === 'on_hold' ? 'selected' : '' ?>>Beklemede</option>
                        <option value="completed" <?= old('status', $project['status'] ?? '') === 'completed' ? 'selected' : '' ?>>Tamamlandı</option>
                        <option value="cancelled" <?= old('status', $project['status'] ?? '') === 'cancelled' ? 'selected' : '' ?>>İptal</option>
                    </select>
                </div>

                <div>
                    <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                    <textarea id="notes" name="notes" rows="4"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"><?= old('notes', $project['notes'] ?? '') ?></textarea>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <a href="<?= base_url('projects') ?>" class="px-4 py-2 text-gray-700 hover:text-gray-900">İptal</a>
                <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    <?= $isEdit ? 'Güncelle' : 'Kaydet' ?>
                </button>
            </div>
        </form>
    </div>
</div>
