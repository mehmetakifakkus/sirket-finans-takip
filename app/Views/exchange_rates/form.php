<?php
$isEdit = !empty($rate);
$formAction = $isEdit ? base_url('exchange-rates/' . $rate['id']) : base_url('exchange-rates');
?>

<div class="max-w-xl mx-auto">
    <div class="mb-6">
        <a href="<?= base_url('exchange-rates') ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
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
                    <label for="rate_date" class="block text-sm font-medium text-gray-700 mb-2">Tarih *</label>
                    <input type="date" id="rate_date" name="rate_date" value="<?= old('rate_date', $rate['rate_date'] ?? date('Y-m-d')) ?>" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div>
                    <label for="quote_currency" class="block text-sm font-medium text-gray-700 mb-2">Para Birimi *</label>
                    <select id="quote_currency" name="quote_currency" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <?php foreach ($currencies as $code => $name): ?>
                        <option value="<?= $code ?>" <?= old('quote_currency', $rate['quote_currency'] ?? '') === $code ? 'selected' : '' ?>><?= esc($name) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label for="rate" class="block text-sm font-medium text-gray-700 mb-2">Kur (1 Birim = ? TRY) *</label>
                    <input type="number" step="0.0001" id="rate" name="rate" value="<?= old('rate', $rate['rate'] ?? '') ?>" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Örn: 32.1234">
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <a href="<?= base_url('exchange-rates') ?>" class="px-4 py-2 text-gray-700 hover:text-gray-900">İptal</a>
                <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    <?= $isEdit ? 'Güncelle' : 'Kaydet' ?>
                </button>
            </div>
        </form>
    </div>
</div>
