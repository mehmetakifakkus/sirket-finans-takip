<!-- Summary Cards -->
<div class="grid grid-cols-3 gap-4 mb-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Toplam Borç</p>
        <p class="text-xl font-bold text-red-600"><?= format_currency($summary['debt']['total_try']) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Toplam Alacak</p>
        <p class="text-xl font-bold text-green-600"><?= format_currency($summary['receivable']['total_try']) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Net Pozisyon</p>
        <p class="text-xl font-bold <?= $summary['net_position'] >= 0 ? 'text-green-600' : 'text-red-600' ?>">
            <?= format_currency($summary['net_position']) ?>
        </p>
    </div>
</div>

<!-- Filter and Actions -->
<div class="flex justify-between items-center mb-6">
    <div class="flex items-center space-x-4">
        <a href="<?= base_url('debts') ?>" class="px-3 py-1 rounded-lg <?= empty($filters['kind']) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Tümü</a>
        <a href="<?= base_url('debts?kind=debt') ?>" class="px-3 py-1 rounded-lg <?= ($filters['kind'] ?? '') === 'debt' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Borçlar</a>
        <a href="<?= base_url('debts?kind=receivable') ?>" class="px-3 py-1 rounded-lg <?= ($filters['kind'] ?? '') === 'receivable' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Alacaklar</a>
    </div>
    <div class="flex space-x-2">
        <a href="<?= base_url('debts/create?kind=debt') ?>" class="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Yeni Borç
        </a>
        <a href="<?= base_url('debts/create?kind=receivable') ?>" class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Yeni Alacak
        </a>
    </div>
</div>

<!-- Debts Table -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taraf</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Anapara</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ödenen</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vade</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($debts)): ?>
            <tr>
                <td colspan="8" class="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($debts as $debt): ?>
            <tr class="hover:bg-gray-50 <?= is_overdue($debt['due_date']) && $debt['status'] === 'open' ? 'bg-red-50' : '' ?>">
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $debt['kind'] === 'debt' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800' ?>">
                        <?= $debt['kind'] === 'debt' ? 'Borç' : 'Alacak' ?>
                    </span>
                </td>
                <td class="px-6 py-4">
                    <a href="<?= base_url('debts/' . $debt['id']) ?>" class="font-medium text-gray-900 hover:text-blue-600">
                        <?= esc($debt['party_name']) ?>
                    </a>
                </td>
                <td class="px-6 py-4 text-right font-medium"><?= format_currency($debt['principal_amount'], $debt['currency']) ?></td>
                <td class="px-6 py-4 text-right text-gray-600"><?= format_currency($debt['paid_amount'], $debt['currency']) ?></td>
                <td class="px-6 py-4 text-right font-medium <?= $debt['kind'] === 'debt' ? 'text-red-600' : 'text-green-600' ?>">
                    <?= format_currency($debt['remaining_amount'], $debt['currency']) ?>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                    <?= format_date($debt['due_date']) ?>
                    <?php if (is_overdue($debt['due_date']) && $debt['status'] === 'open'): ?>
                    <span class="text-red-600 text-xs">(Gecikmiş)</span>
                    <?php endif; ?>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $debt['status'] === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800' ?>">
                        <?= $debt['status'] === 'open' ? 'Açık' : 'Kapalı' ?>
                    </span>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                    <a href="<?= base_url('debts/' . $debt['id']) ?>" class="text-blue-600 hover:text-blue-800">Detay</a>
                    <?php if ($canDelete): ?>
                    <form action="<?= base_url('debts/' . $debt['id']) ?>" method="post" class="inline" onsubmit="return confirmDelete(this)">
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
