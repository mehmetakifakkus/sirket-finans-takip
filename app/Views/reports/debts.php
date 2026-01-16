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
    <form action="<?= base_url('reports/debts') ?>" method="get" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tip</label>
            <select name="kind" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Tümü</option>
                <option value="debt" <?= ($filters['kind'] ?? '') === 'debt' ? 'selected' : '' ?>>Borç</option>
                <option value="receivable" <?= ($filters['kind'] ?? '') === 'receivable' ? 'selected' : '' ?>>Alacak</option>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Durum</label>
            <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Tümü</option>
                <option value="open" <?= ($filters['status'] ?? '') === 'open' ? 'selected' : '' ?>>Açık</option>
                <option value="closed" <?= ($filters['status'] ?? '') === 'closed' ? 'selected' : '' ?>>Kapalı</option>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Taraf</label>
            <select name="party_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Tümü</option>
                <?php foreach ($parties as $party): ?>
                <option value="<?= $party['id'] ?>" <?= ($filters['party_id'] ?? '') == $party['id'] ? 'selected' : '' ?>><?= esc($party['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="flex items-end space-x-2">
            <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Filtrele</button>
            <a href="<?= base_url('reports/debts') ?>" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg">Temizle</a>
        </div>
    </form>
</div>

<!-- Summary Cards -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Toplam Borç</p>
        <p class="text-xl font-bold text-red-600"><?= format_currency($totals['debt'] ?? 0) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Toplam Alacak</p>
        <p class="text-xl font-bold text-green-600"><?= format_currency($totals['receivable'] ?? 0) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Net Pozisyon</p>
        <?php $net = ($totals['receivable'] ?? 0) - ($totals['debt'] ?? 0); ?>
        <p class="text-xl font-bold <?= $net >= 0 ? 'text-green-600' : 'text-red-600' ?>"><?= format_currency($net) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500">Vadesi Geçmiş</p>
        <p class="text-xl font-bold text-orange-600"><?= $totals['overdue_count'] ?? 0 ?> adet</p>
    </div>
</div>

<!-- Export Button -->
<div class="flex justify-end mb-4">
    <a href="<?= base_url('reports/debts/export?' . http_build_query($filters ?? [])) ?>"
       class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        CSV İndir
    </a>
</div>

<!-- Debts Table -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taraf</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Anapara</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ödenen</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vade</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($debts)): ?>
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($debts as $debt): ?>
            <?php
            $remaining = $debt['remaining_amount'] ?? ($debt['principal_amount'] - ($debt['paid_amount'] ?? 0));
            $isOverdue = $debt['status'] === 'open' && $debt['due_date'] && strtotime($debt['due_date']) < time();
            ?>
            <tr class="hover:bg-gray-50 <?= $isOverdue ? 'bg-red-50' : '' ?>">
                <td class="px-6 py-4">
                    <a href="<?= base_url('debts/' . $debt['id']) ?>" class="font-medium text-gray-900 hover:text-blue-600">
                        <?= esc($debt['party_name'] ?? '-') ?>
                    </a>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $debt['kind'] === 'debt' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800' ?>">
                        <?= $debt['kind'] === 'debt' ? 'Borç' : 'Alacak' ?>
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-medium"><?= format_currency($debt['principal_amount'], $debt['currency']) ?></td>
                <td class="px-6 py-4 text-right text-green-600"><?= format_currency($debt['paid_amount'] ?? 0, $debt['currency']) ?></td>
                <td class="px-6 py-4 text-right font-medium <?= $remaining > 0 ? 'text-red-600' : 'text-green-600' ?>">
                    <?= format_currency($remaining, $debt['currency']) ?>
                </td>
                <td class="px-6 py-4 <?= $isOverdue ? 'text-red-600 font-medium' : 'text-gray-600' ?>">
                    <?= $debt['due_date'] ? format_date($debt['due_date']) : '-' ?>
                    <?php if ($isOverdue): ?>
                    <span class="text-xs">(Gecikmiş)</span>
                    <?php endif; ?>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $debt['status'] === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800' ?>">
                        <?= $debt['status'] === 'open' ? 'Açık' : 'Kapalı' ?>
                    </span>
                </td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>
