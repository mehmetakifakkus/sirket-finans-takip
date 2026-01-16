<div class="mb-6">
    <a href="<?= base_url('projects') ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        Projelere Dön
    </a>
</div>

<!-- Project Header -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
    <div class="flex justify-between items-start">
        <div>
            <h2 class="text-2xl font-bold text-gray-900"><?= esc($project['title']) ?></h2>
            <?php if ($project['party_name']): ?>
            <p class="text-gray-600 mt-1">Müşteri: <?= esc($project['party_name']) ?></p>
            <?php endif; ?>
            <?php if ($project['start_date']): ?>
            <p class="text-sm text-gray-500 mt-2">
                <?= format_date($project['start_date']) ?> - <?= format_date($project['end_date']) ?>
            </p>
            <?php endif; ?>
        </div>
        <div class="flex items-center space-x-3">
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
            <span class="px-3 py-1 text-sm font-medium rounded-full <?= $statusClass ?>"><?= $statusLabel ?></span>
            <a href="<?= base_url('projects/' . $project['id'] . '/edit') ?>" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Düzenle</a>
        </div>
    </div>

    <?php if ($project['notes']): ?>
    <div class="mt-4 p-4 bg-gray-50 rounded-lg">
        <p class="text-sm text-gray-600"><?= nl2br(esc($project['notes'])) ?></p>
    </div>
    <?php endif; ?>
</div>

<!-- Financial Summary -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p class="text-sm text-gray-500">Sözleşme Tutarı</p>
        <p class="text-2xl font-bold text-gray-800"><?= format_currency($project['contract_amount'], $project['currency']) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p class="text-sm text-gray-500">Tahsil Edilen</p>
        <p class="text-2xl font-bold text-green-600"><?= format_currency($balance['collected_amount'], $project['currency']) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p class="text-sm text-gray-500">Kalan Tutar</p>
        <p class="text-2xl font-bold text-red-600"><?= format_currency($balance['remaining_amount'], $project['currency']) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p class="text-sm text-gray-500">İlerleme</p>
        <div class="flex items-center">
            <span class="text-2xl font-bold text-blue-600"><?= $balance['percentage'] ?>%</span>
            <div class="ml-4 flex-1">
                <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="bg-blue-600 h-3 rounded-full" style="width: <?= min(100, $balance['percentage']) ?>%"></div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Milestones -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-900">Kilometre Taşları</h3>
        <a href="<?= base_url('projects/' . $project['id'] . '/milestones/create') ?>" class="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Yeni
        </a>
    </div>
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlık</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beklenen Tarih</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($milestones)): ?>
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">Kilometre taşı bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($milestones as $milestone): ?>
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <p class="font-medium text-gray-900"><?= esc($milestone['title']) ?></p>
                    <?php if ($milestone['notes']): ?>
                    <p class="text-xs text-gray-500"><?= esc($milestone['notes']) ?></p>
                    <?php endif; ?>
                </td>
                <td class="px-6 py-4 text-gray-600"><?= format_date($milestone['expected_date']) ?></td>
                <td class="px-6 py-4 text-right font-medium"><?= format_currency($milestone['expected_amount'], $milestone['currency']) ?></td>
                <td class="px-6 py-4">
                    <?php
                    $mStatusClass = match($milestone['status']) {
                        'pending' => 'bg-yellow-100 text-yellow-800',
                        'invoiced' => 'bg-blue-100 text-blue-800',
                        'paid' => 'bg-green-100 text-green-800',
                        default => 'bg-gray-100 text-gray-800',
                    };
                    $mStatusLabel = match($milestone['status']) {
                        'pending' => 'Bekliyor',
                        'invoiced' => 'Faturalandı',
                        'paid' => 'Ödendi',
                        default => $milestone['status'],
                    };
                    ?>
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $mStatusClass ?>"><?= $mStatusLabel ?></span>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                    <a href="<?= base_url('projects/' . $project['id'] . '/milestones/' . $milestone['id'] . '/edit') ?>" class="text-blue-600 hover:text-blue-800">Düzenle</a>
                    <?php if ($canDelete): ?>
                    <form action="<?= base_url('projects/' . $project['id'] . '/milestones/' . $milestone['id']) ?>" method="post" class="inline" onsubmit="return confirmDelete(this)">
                        <?= csrf_field() ?>
                        <input type="hidden" name="_method" value="DELETE">
                        <button type="submit" class="text-red-600 hover:text-red-800">Sil</button>
                    </form>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<!-- Related Transactions -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-900">İlgili İşlemler</h3>
        <a href="<?= base_url('transactions/create?project_id=' . $project['id']) ?>" class="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Yeni İşlem
        </a>
    </div>
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($transactions)): ?>
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-gray-500">İlgili işlem bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($transactions as $transaction): ?>
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-gray-600"><?= format_date($transaction['date']) ?></td>
                <td class="px-6 py-4 text-gray-900"><?= esc($transaction['description']) ?></td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $transaction['type'] === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' ?>">
                        <?= $transaction['type'] === 'income' ? 'Gelir' : 'Gider' ?>
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-medium <?= $transaction['type'] === 'income' ? 'text-green-600' : 'text-red-600' ?>">
                    <?= $transaction['type'] === 'income' ? '+' : '-' ?><?= format_currency($transaction['net_amount'], $transaction['currency']) ?>
                </td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>
