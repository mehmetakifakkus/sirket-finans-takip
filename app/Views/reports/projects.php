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
    <form action="<?= base_url('reports/projects') ?>" method="get" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Durum</label>
            <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Tümü</option>
                <option value="active" <?= ($filters['status'] ?? '') === 'active' ? 'selected' : '' ?>>Aktif</option>
                <option value="completed" <?= ($filters['status'] ?? '') === 'completed' ? 'selected' : '' ?>>Tamamlandı</option>
                <option value="on_hold" <?= ($filters['status'] ?? '') === 'on_hold' ? 'selected' : '' ?>>Beklemede</option>
                <option value="cancelled" <?= ($filters['status'] ?? '') === 'cancelled' ? 'selected' : '' ?>>İptal</option>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Müşteri</label>
            <select name="party_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Tümü</option>
                <?php foreach ($parties as $party): ?>
                <option value="<?= $party['id'] ?>" <?= ($filters['party_id'] ?? '') == $party['id'] ? 'selected' : '' ?>><?= esc($party['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Para Birimi</label>
            <select name="currency" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Tümü</option>
                <option value="TRY" <?= ($filters['currency'] ?? '') === 'TRY' ? 'selected' : '' ?>>TRY</option>
                <option value="USD" <?= ($filters['currency'] ?? '') === 'USD' ? 'selected' : '' ?>>USD</option>
                <option value="EUR" <?= ($filters['currency'] ?? '') === 'EUR' ? 'selected' : '' ?>>EUR</option>
            </select>
        </div>
        <div class="flex items-end space-x-2">
            <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Filtrele</button>
            <a href="<?= base_url('reports/projects') ?>" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg">Temizle</a>
        </div>
    </form>
</div>

<!-- Summary Cards -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Toplam Sözleşme</p>
        <p class="text-xl font-bold text-gray-800"><?= format_currency($totals['contract'] ?? 0) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Toplam Tahsilat</p>
        <p class="text-xl font-bold text-green-600"><?= format_currency($totals['collected'] ?? 0) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Kalan Alacak</p>
        <p class="text-xl font-bold text-red-600"><?= format_currency($totals['remaining'] ?? 0) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Tahsilat Oranı</p>
        <p class="text-xl font-bold text-blue-600"><?= $totals['percentage'] ?? 0 ?>%</p>
    </div>
</div>

<!-- Export Button -->
<div class="flex justify-end mb-4">
    <a href="<?= base_url('reports/projects/export?' . http_build_query($filters ?? [])) ?>"
       class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        CSV İndir
    </a>
</div>

<!-- Projects Table -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proje</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sözleşme</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tahsilat</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İlerleme</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($projects)): ?>
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($projects as $project): ?>
            <?php
            $balance = $project['balance'] ?? ['collected_amount' => 0, 'remaining_amount' => $project['contract_amount'], 'percentage' => 0];
            ?>
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <a href="<?= base_url('projects/' . $project['id']) ?>" class="font-medium text-gray-900 hover:text-blue-600">
                        <?= esc($project['title']) ?>
                    </a>
                    <?php if ($project['start_date']): ?>
                    <p class="text-xs text-gray-500"><?= format_date($project['start_date']) ?> - <?= format_date($project['end_date']) ?></p>
                    <?php endif; ?>
                </td>
                <td class="px-6 py-4 text-gray-600"><?= esc($project['party_name'] ?? '-') ?></td>
                <td class="px-6 py-4 text-right font-medium"><?= format_currency($project['contract_amount'], $project['currency']) ?></td>
                <td class="px-6 py-4 text-right text-green-600"><?= format_currency($balance['collected_amount'], $project['currency']) ?></td>
                <td class="px-6 py-4 text-right text-red-600"><?= format_currency($balance['remaining_amount'], $project['currency']) ?></td>
                <td class="px-6 py-4">
                    <div class="w-24">
                        <div class="flex justify-between text-xs mb-1">
                            <span><?= $balance['percentage'] ?>%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: <?= min(100, $balance['percentage']) ?>%"></div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <?php
                    $statusClass = match($project['status']) {
                        'active' => 'bg-green-100 text-green-800',
                        'completed' => 'bg-blue-100 text-blue-800',
                        'cancelled' => 'bg-red-100 text-red-800',
                        'on_hold' => 'bg-yellow-100 text-yellow-800',
                        default => 'bg-gray-100 text-gray-800',
                    };
                    $statusLabel = match($project['status']) {
                        'active' => 'Aktif',
                        'completed' => 'Tamamlandı',
                        'cancelled' => 'İptal',
                        'on_hold' => 'Beklemede',
                        default => $project['status'],
                    };
                    ?>
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $statusClass ?>"><?= $statusLabel ?></span>
                </td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>
