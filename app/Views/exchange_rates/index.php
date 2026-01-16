<!-- Latest Rates -->
<?php if (!empty($latestRates)): ?>
<div class="grid grid-cols-2 gap-4 mb-6">
    <?php foreach ($latestRates as $currency => $rate): ?>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div class="flex justify-between items-center">
            <div>
                <p class="text-sm text-gray-500"><?= esc($currency) ?> / TRY</p>
                <p class="text-2xl font-bold text-gray-800"><?= number_format($rate['rate'], 4, ',', '.') ?> ₺</p>
                <p class="text-xs text-gray-400"><?= format_date($rate['rate_date']) ?> - <?= $rate['source'] === 'tcmb' ? 'TCMB' : 'Manuel' ?></p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                <?= $currency === 'USD' ? '$' : '€' ?>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<!-- Actions -->
<div class="flex justify-between items-center mb-6">
    <form action="<?= base_url('exchange-rates/fetch-tcmb') ?>" method="post" class="inline">
        <?= csrf_field() ?>
        <button type="submit" class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            TCMB'den Kur Çek
        </button>
    </form>
    <a href="<?= base_url('exchange-rates/create') ?>" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Manuel Kur Ekle
    </a>
</div>

<!-- Rates Table -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Para Birimi</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kur</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kaynak</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($rates)): ?>
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($rates as $rate): ?>
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-gray-600"><?= format_date($rate['rate_date']) ?></td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        <?= esc($rate['quote_currency']) ?>
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-medium text-gray-900"><?= number_format($rate['rate'], 4, ',', '.') ?> ₺</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $rate['source'] === 'tcmb' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800' ?>">
                        <?= $rate['source'] === 'tcmb' ? 'TCMB' : 'Manuel' ?>
                    </span>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                    <a href="<?= base_url('exchange-rates/' . $rate['id'] . '/edit') ?>" class="text-blue-600 hover:text-blue-800">Düzenle</a>
                    <form action="<?= base_url('exchange-rates/' . $rate['id']) ?>" method="post" class="inline" onsubmit="return confirmDelete(this)">
                        <?= csrf_field() ?>
                        <input type="hidden" name="_method" value="DELETE">
                        <button type="submit" class="text-red-600 hover:text-red-800">Sil</button>
                    </form>
                </td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>
