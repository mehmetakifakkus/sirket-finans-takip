<!-- Filter Panel -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6" x-data="{ showFilters: false }">
    <div class="flex justify-between items-center">
        <button @click="showFilters = !showFilters" class="flex items-center text-gray-700 hover:text-gray-900">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
            Filtreler
            <span x-text="showFilters ? '▲' : '▼'" class="ml-2 text-xs"></span>
        </button>
        <div class="flex space-x-2">
            <a href="<?= base_url('transactions/create?type=income') ?>" class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Yeni Gelir
            </a>
            <a href="<?= base_url('transactions/create?type=expense') ?>" class="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                </svg>
                Yeni Gider
            </a>
        </div>
    </div>

    <form action="<?= base_url('transactions') ?>" method="get" x-show="showFilters" x-cloak class="mt-4 pt-4 border-t border-gray-200">
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Tip</label>
                <select name="type" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    <option value="">Tümü</option>
                    <option value="income" <?= ($filters['type'] ?? '') === 'income' ? 'selected' : '' ?>>Gelir</option>
                    <option value="expense" <?= ($filters['type'] ?? '') === 'expense' ? 'selected' : '' ?>>Gider</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                <select name="category_id" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    <option value="">Tümü</option>
                    <?php foreach ($categories as $id => $name): ?>
                    <option value="<?= $id ?>" <?= ($filters['category_id'] ?? '') == $id ? 'selected' : '' ?>><?= esc($name) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Taraf</label>
                <select name="party_id" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    <option value="">Tümü</option>
                    <?php foreach ($parties as $id => $name): ?>
                    <option value="<?= $id ?>" <?= ($filters['party_id'] ?? '') == $id ? 'selected' : '' ?>><?= esc($name) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Başlangıç</label>
                <input type="date" name="date_from" value="<?= $filters['date_from'] ?? '' ?>" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Bitiş</label>
                <input type="date" name="date_to" value="<?= $filters['date_to'] ?? '' ?>" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
            </div>
            <div class="flex items-end space-x-2">
                <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Filtrele</button>
                <a href="<?= base_url('transactions') ?>" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg">Temizle</a>
            </div>
        </div>
    </form>
</div>

<!-- Summary Cards -->
<div class="grid grid-cols-3 gap-4 mb-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Toplam Gelir</p>
        <p class="text-xl font-bold text-green-600"><?= format_currency($totals['income']) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Toplam Gider</p>
        <p class="text-xl font-bold text-red-600"><?= format_currency($totals['expense']) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Net</p>
        <p class="text-xl font-bold <?= ($totals['income'] - $totals['expense']) >= 0 ? 'text-green-600' : 'text-red-600' ?>">
            <?= format_currency($totals['income'] - $totals['expense']) ?>
        </p>
    </div>
</div>

<!-- Export Button -->
<div class="flex justify-end mb-4">
    <a href="<?= base_url('transactions/export?' . http_build_query($filters)) ?>" class="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taraf</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">TRY</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
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
                <td class="px-6 py-4 text-sm text-gray-600"><?= format_date($t['date']) ?></td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $t['type'] === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' ?>">
                        <?= $t['type'] === 'income' ? 'Gelir' : 'Gider' ?>
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600"><?= esc($t['category_name'] ?? '-') ?></td>
                <td class="px-6 py-4 text-sm text-gray-600"><?= esc($t['party_name'] ?? '-') ?></td>
                <td class="px-6 py-4 text-right font-medium <?= $t['type'] === 'income' ? 'text-green-600' : 'text-red-600' ?>">
                    <?= format_currency($t['net_amount'], $t['currency']) ?>
                </td>
                <td class="px-6 py-4 text-right text-sm text-gray-500">
                    <?= format_currency($t['amount_try']) ?>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                    <?php if ($canEdit): ?>
                    <a href="<?= base_url('transactions/' . $t['id'] . '/edit') ?>" class="text-blue-600 hover:text-blue-800">
                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </a>
                    <?php endif; ?>
                    <?php if ($canDelete): ?>
                    <form action="<?= base_url('transactions/' . $t['id']) ?>" method="post" class="inline" onsubmit="return confirmDelete(this)">
                        <?= csrf_field() ?>
                        <input type="hidden" name="_method" value="DELETE">
                        <button type="submit" class="text-red-600 hover:text-red-800">
                            <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </form>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>
