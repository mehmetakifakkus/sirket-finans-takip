<?php
$isEdit = !empty($installment);
$formAction = $isEdit ? base_url('installments/' . $installment['id']) : base_url('debts/' . $debt['id'] . '/installments');
?>

<div class="max-w-xl mx-auto">
    <div class="mb-6">
        <a href="<?= base_url('debts/' . $debt['id']) ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Geri
        </a>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-500">Borç/Alacak</p>
            <p class="font-medium text-gray-900"><?= esc($debt['party_name']) ?></p>
            <p class="text-lg font-bold <?= $debt['kind'] === 'debt' ? 'text-red-600' : 'text-green-600' ?>">
                <?= format_currency($debt['principal_amount'], $debt['currency']) ?>
            </p>
        </div>

        <form action="<?= $formAction ?>" method="post">
            <?= csrf_field() ?>
            <?php if ($isEdit): ?>
            <input type="hidden" name="_method" value="PUT">
            <?php endif; ?>

            <div class="space-y-6">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="due_date" class="block text-sm font-medium text-gray-700 mb-2">Vade Tarihi *</label>
                        <input type="date" id="due_date" name="due_date" value="<?= old('due_date', $installment['due_date'] ?? '') ?>" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="amount" class="block text-sm font-medium text-gray-700 mb-2">Tutar *</label>
                        <input type="number" step="0.01" id="amount" name="amount" value="<?= old('amount', $installment['amount'] ?? '') ?>" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="currency" class="block text-sm font-medium text-gray-700 mb-2">Para Birimi</label>
                        <select id="currency" name="currency" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <?php foreach ($currencies as $code => $name): ?>
                            <option value="<?= $code ?>" <?= old('currency', $installment['currency'] ?? $debt['currency']) === $code ? 'selected' : '' ?>><?= esc($name) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div>
                        <label for="status" class="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                        <select id="status" name="status" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="pending" <?= old('status', $installment['status'] ?? 'pending') === 'pending' ? 'selected' : '' ?>>Bekliyor</option>
                            <option value="partial" <?= old('status', $installment['status'] ?? '') === 'partial' ? 'selected' : '' ?>>Kısmi Ödeme</option>
                            <option value="paid" <?= old('status', $installment['status'] ?? '') === 'paid' ? 'selected' : '' ?>>Ödendi</option>
                        </select>
                    </div>
                </div>

                <?php if ($isEdit): ?>
                <div>
                    <label for="paid_amount" class="block text-sm font-medium text-gray-700 mb-2">Ödenen Tutar</label>
                    <input type="number" step="0.01" id="paid_amount" name="paid_amount" value="<?= old('paid_amount', $installment['paid_amount'] ?? 0) ?>"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <?php endif; ?>

                <div>
                    <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                    <textarea id="notes" name="notes" rows="2"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"><?= old('notes', $installment['notes'] ?? '') ?></textarea>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <a href="<?= base_url('debts/' . $debt['id']) ?>" class="px-4 py-2 text-gray-700 hover:text-gray-900">İptal</a>
                <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    <?= $isEdit ? 'Güncelle' : 'Kaydet' ?>
                </button>
            </div>
        </form>
    </div>
</div>
