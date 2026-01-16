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
        <!-- Info Box -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-sm text-gray-500">Taksit Ödemesi</p>
                    <p class="font-medium text-gray-900"><?= esc($debt['party_name']) ?></p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-500">Vade: <?= format_date($installment['due_date']) ?></p>
                    <p class="text-lg font-bold <?= $debt['kind'] === 'debt' ? 'text-red-600' : 'text-green-600' ?>">
                        <?= format_currency($installment['amount'], $installment['currency']) ?>
                    </p>
                </div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-200">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Ödenen:</span>
                    <span class="font-medium"><?= format_currency($installment['paid_amount'], $installment['currency']) ?></span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Kalan:</span>
                    <span class="font-bold <?= $debt['kind'] === 'debt' ? 'text-red-600' : 'text-green-600' ?>">
                        <?= format_currency($remainingAmount, $installment['currency']) ?>
                    </span>
                </div>
            </div>
        </div>

        <form action="<?= base_url('installments/' . $installment['id'] . '/pay') ?>" method="post">
            <?= csrf_field() ?>

            <div class="space-y-6">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="date" class="block text-sm font-medium text-gray-700 mb-2">Ödeme Tarihi *</label>
                        <input type="date" id="date" name="date" value="<?= old('date', date('Y-m-d')) ?>" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label for="amount" class="block text-sm font-medium text-gray-700 mb-2">Ödeme Tutarı *</label>
                        <input type="number" step="0.01" id="amount" name="amount" value="<?= old('amount', $remainingAmount) ?>" max="<?= $remainingAmount ?>" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                </div>

                <div>
                    <label for="method" class="block text-sm font-medium text-gray-700 mb-2">Ödeme Yöntemi *</label>
                    <select id="method" name="method" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <?php foreach ($paymentMethods as $value => $label): ?>
                        <option value="<?= $value ?>" <?= old('method', 'bank') === $value ? 'selected' : '' ?>><?= esc($label) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label class="flex items-center">
                        <input type="checkbox" name="create_transaction" value="1" checked
                               class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700">Otomatik işlem kaydı oluştur</span>
                    </label>
                </div>

                <div>
                    <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                    <textarea id="notes" name="notes" rows="2"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"><?= old('notes') ?></textarea>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <a href="<?= base_url('debts/' . $debt['id']) ?>" class="px-4 py-2 text-gray-700 hover:text-gray-900">İptal</a>
                <button type="submit" class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">
                    Ödemeyi Kaydet
                </button>
            </div>
        </form>
    </div>
</div>
