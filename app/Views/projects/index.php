<div class="flex justify-between items-center mb-6">
    <div class="flex items-center space-x-4">
        <a href="<?= base_url('projects') ?>" class="px-3 py-1 rounded-lg <?= empty($currentStatus) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Tümü</a>
        <a href="<?= base_url('projects?status=active') ?>" class="px-3 py-1 rounded-lg <?= $currentStatus === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Aktif</a>
        <a href="<?= base_url('projects?status=completed') ?>" class="px-3 py-1 rounded-lg <?= $currentStatus === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Tamamlanan</a>
    </div>
    <a href="<?= base_url('projects/create') ?>" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Yeni Proje
    </a>
</div>

<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proje</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sözleşme</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tahsilat</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İlerleme</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($projects)): ?>
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($projects as $project): ?>
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
                <td class="px-6 py-4 text-right text-green-600"><?= format_currency($project['balance']['collected_amount'], $project['currency']) ?></td>
                <td class="px-6 py-4">
                    <div class="w-24">
                        <div class="flex justify-between text-xs mb-1">
                            <span><?= $project['balance']['percentage'] ?>%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: <?= min(100, $project['balance']['percentage']) ?>%"></div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <?php
                    $statusClass = match($project['status']) {
                        'active' => 'bg-green-100 text-green-800',
                        'completed' => 'bg-blue-100 text-blue-800',
                        'cancelled' => 'bg-red-100 text-red-800',
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
                <td class="px-6 py-4 text-right space-x-2">
                    <a href="<?= base_url('projects/' . $project['id']) ?>" class="text-blue-600 hover:text-blue-800">Detay</a>
                    <?php if ($canDelete): ?>
                    <form action="<?= base_url('projects/' . $project['id']) ?>" method="post" class="inline" onsubmit="return confirmDelete(this)">
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
