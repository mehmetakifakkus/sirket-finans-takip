<div class="mb-6">
    <a href="<?= base_url('debts') ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        Geri
    </a>
</div>

<!-- Summary -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-800"><?= $debt['kind'] === 'debt' ? 'Borç' : 'Alacak' ?> Detayı</h3>
            <span class="px-2 py-1 text-xs font-medium rounded-full <?= $debt['status'] === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800' ?>">
                <?= $debt['status'] === 'open' ? 'Açık' : 'Kapalı' ?>
            </span>
        </div>
        <div class="space-y-3">
            <div>
                <p class="text-sm text-gray-500">Taraf</p>
                <p class="font-medium text-gray-900"><?= esc($debt['party_name']) ?></p>
            </div>
            <div>
                <p class="text-sm text-gray-500">Anapara</p>
                <p class="text-xl font-bold <?= $debt['kind'] === 'debt' ? 'text-red-600' : 'text-green-600' ?>">
                    <?= format_currency($debt['principal_amount'], $debt['currency']) ?>
                </p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-500">Başlangıç</p>
                    <p class="font-medium"><?= format_date($debt['start_date']) ?></p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Vade</p>
                    <p class="font-medium <?= is_overdue($debt['due_date']) && $debt['status'] === 'open' ? 'text-red-600' : '' ?>">
                        <?= format_date($debt['due_date']) ?>
                    </p>
                </div>
            </div>
        </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Ödeme Durumu</h3>
        <div class="space-y-4">
            <div>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-500">Ödeme İlerlemesi</span>
                    <span class="font-medium"><?= $debt['payment_percentage'] ?>%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="<?= $debt['kind'] === 'debt' ? 'bg-red-600' : 'bg-green-600' ?> h-3 rounded-full" style="width: <?= min(100, $debt['payment_percentage']) ?>%"></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 pt-2">
                <div>
                    <p class="text-sm text-gray-500">Ödenen</p>
                    <p class="font-medium text-gray-900"><?= format_currency($debt['total_paid'], $debt['currency']) ?></p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Kalan</p>
                    <p class="font-bold <?= $debt['kind'] === 'debt' ? 'text-red-600' : 'text-green-600' ?>">
                        <?= format_currency($debt['remaining_amount'], $debt['currency']) ?>
                    </p>
                </div>
            </div>
        </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">İşlemler</h3>
        <div class="space-y-2">
            <a href="<?= base_url('debts/' . $debt['id'] . '/installments/create') ?>" class="block w-full px-4 py-2 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                Taksit Ekle
            </a>
            <?php if ($canEdit): ?>
            <a href="<?= base_url('debts/' . $debt['id'] . '/edit') ?>" class="block w-full px-4 py-2 text-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg">
                Düzenle
            </a>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Installments -->
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-800">Taksitler</h3>
        <span class="text-sm text-gray-500"><?= count($debt['installments']) ?> taksit</span>
    </div>
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vade</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ödenen</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($debt['installments'])): ?>
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">Taksit bulunmuyor.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($debt['installments'] as $installment): ?>
            <?php $remaining = (float)$installment['amount'] - (float)$installment['paid_amount']; ?>
            <tr class="hover:bg-gray-50 <?= is_overdue($installment['due_date']) && $installment['status'] !== 'paid' ? 'bg-red-50' : '' ?>">
                <td class="px-6 py-4">
                    <?= format_date($installment['due_date']) ?>
                    <?php if (is_overdue($installment['due_date']) && $installment['status'] !== 'paid'): ?>
                    <span class="text-red-600 text-xs">(Gecikmiş)</span>
                    <?php endif; ?>
                </td>
                <td class="px-6 py-4 text-right font-medium"><?= format_currency($installment['amount'], $installment['currency']) ?></td>
                <td class="px-6 py-4 text-right text-gray-600"><?= format_currency($installment['paid_amount'], $installment['currency']) ?></td>
                <td class="px-6 py-4 text-right font-medium <?= $remaining > 0 ? 'text-red-600' : 'text-green-600' ?>">
                    <?= format_currency($remaining, $installment['currency']) ?>
                </td>
                <td class="px-6 py-4">
                    <?php
                    $statusClass = match($installment['status']) {
                        'paid' => 'bg-green-100 text-green-800',
                        'partial' => 'bg-yellow-100 text-yellow-800',
                        default => 'bg-gray-100 text-gray-800',
                    };
                    $statusLabel = match($installment['status']) {
                        'paid' => 'Ödendi',
                        'partial' => 'Kısmi',
                        default => 'Bekliyor',
                    };
                    ?>
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $statusClass ?>"><?= $statusLabel ?></span>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                    <?php if ($installment['status'] !== 'paid'): ?>
                    <a href="<?= base_url('installments/' . $installment['id'] . '/pay') ?>" class="text-green-600 hover:text-green-800">Ödeme</a>
                    <?php endif; ?>
                    <?php if ($canEdit): ?>
                    <a href="<?= base_url('installments/' . $installment['id'] . '/edit') ?>" class="text-blue-600 hover:text-blue-800">Düzenle</a>
                    <?php endif; ?>
                    <?php if ($canDelete): ?>
                    <form action="<?= base_url('installments/' . $installment['id']) ?>" method="post" class="inline" onsubmit="return confirmDelete(this)">
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
