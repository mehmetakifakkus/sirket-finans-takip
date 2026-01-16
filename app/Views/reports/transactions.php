<div class="mb-6">
    <a href="<?= base_url('reports') ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        Raporlara Dön
    </a>
</div>

<!-- Filter Panel -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
    <form action="<?= base_url('reports/transactions') ?>" method="get" class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
            <input type="date" name="start_date" value="<?= esc($filters['start_date'] ?? '') ?>"
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
            <input type="date" name="end_date" value="<?= esc($filters['end_date'] ?? '') ?>"
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tip</label>
            <select name="type" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Tümü</option>
                <option value="income" <?= ($filters['type'] ?? '') === 'income' ? 'selected' : '' ?>>Gelir</option>
                <option value="expense" <?= ($filters['type'] ?? '') === 'expense' ? 'selected' : '' ?>>Gider</option>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
            <select name="category_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Tümü</option>
                <?php foreach ($categories as $cat): ?>
                <option value="<?= $cat['id'] ?>" <?= ($filters['category_id'] ?? '') == $cat['id'] ? 'selected' : '' ?>><?= esc($cat['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="flex items-end space-x-2">
            <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Filtrele</button>
            <a href="<?= base_url('reports/transactions') ?>" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg">Temizle</a>
        </div>
    </form>
</div>

<!-- Summary Cards -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Toplam Gelir</p>
        <p class="text-xl font-bold text-green-600"><?= format_currency($totals['income'] ?? 0) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Toplam Gider</p>
        <p class="text-xl font-bold text-red-600"><?= format_currency($totals['expense'] ?? 0) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Net</p>
        <?php $net = ($totals['income'] ?? 0) - ($totals['expense'] ?? 0); ?>
        <p class="text-xl font-bold <?= $net >= 0 ? 'text-green-600' : 'text-red-600' ?>"><?= format_currency($net) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">İşlem Sayısı</p>
        <p class="text-xl font-bold text-gray-800"><?= count($transactions) ?></p>
    </div>
</div>

<!-- Export Button -->
<div class="flex justify-end mb-4">
    <a href="<?= base_url('reports/transactions/export?' . http_build_query($filters ?? [])) ?>"
       class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        CSV İndir
    </a>
</div>

<!-- Transactions Table -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taraf</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">TRY Karşılığı</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($transactions)): ?>
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($transactions as $t): ?>
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-gray-600"><?= format_date($t['date']) ?></td>
                <td class="px-6 py-4 text-gray-900"><?= esc($t['description']) ?></td>
                <td class="px-6 py-4 text-gray-600"><?= esc($t['category_name'] ?? '-') ?></td>
                <td class="px-6 py-4 text-gray-600"><?= esc($t['party_name'] ?? '-') ?></td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $t['type'] === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' ?>">
                        <?= $t['type'] === 'income' ? 'Gelir' : 'Gider' ?>
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-medium <?= $t['type'] === 'income' ? 'text-green-600' : 'text-red-600' ?>">
                    <?= format_currency($t['net_amount'], $t['currency']) ?>
                </td>
                <td class="px-6 py-4 text-right text-gray-600">
                    <?= format_currency($t['amount_try'] ?? $t['net_amount']) ?>
                </td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>
