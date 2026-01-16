<!-- Summary Cards -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
    <!-- Monthly Income -->
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">Bu Ay Gelir</p>
                <p class="text-2xl font-bold text-green-600"><?= format_currency($dashboard['monthly_income']) ?></p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path>
                </svg>
            </div>
        </div>
    </div>

    <!-- Monthly Expense -->
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">Bu Ay Gider</p>
                <p class="text-2xl font-bold text-red-600"><?= format_currency($dashboard['monthly_expense']) ?></p>
            </div>
            <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path>
                </svg>
            </div>
        </div>
    </div>

    <!-- Total Receivable -->
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">Toplam Alacak</p>
                <p class="text-2xl font-bold text-blue-600"><?= format_currency($dashboard['total_receivable']) ?></p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
        </div>
    </div>

    <!-- Total Debt -->
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">Toplam Borç</p>
                <p class="text-2xl font-bold text-orange-600"><?= format_currency($dashboard['total_debt']) ?></p>
            </div>
            <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                </svg>
            </div>
        </div>
    </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <!-- Net Position -->
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Net Durum</h3>
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <span class="text-gray-600">Bu Ay Net:</span>
                <span class="text-xl font-bold <?= $dashboard['monthly_balance'] >= 0 ? 'text-green-600' : 'text-red-600' ?>">
                    <?= format_currency($dashboard['monthly_balance']) ?>
                </span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-gray-600">Alacak - Borç:</span>
                <span class="text-xl font-bold <?= $dashboard['net_position'] >= 0 ? 'text-green-600' : 'text-red-600' ?>">
                    <?= format_currency($dashboard['net_position']) ?>
                </span>
            </div>
        </div>
    </div>

    <!-- Exchange Rates -->
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Güncel Kurlar</h3>
        <div class="space-y-3">
            <?php if (!empty($rates)): ?>
                <?php foreach ($rates as $currency => $rate): ?>
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center">
                        <span class="font-medium text-gray-700"><?= esc($currency) ?></span>
                        <span class="text-xs text-gray-500 ml-2">(<?= format_date($rate['rate_date']) ?>)</span>
                    </div>
                    <span class="text-lg font-semibold text-gray-800"><?= number_format($rate['rate'], 4, ',', '.') ?> ₺</span>
                </div>
                <?php endforeach; ?>
            <?php else: ?>
                <p class="text-gray-500 text-sm">Kur bilgisi bulunamadı.</p>
            <?php endif; ?>
        </div>
        <?php if ($isAdmin): ?>
        <div class="mt-4">
            <a href="<?= base_url('exchange-rates') ?>" class="text-blue-600 hover:text-blue-800 text-sm">Kur Yönetimi &rarr;</a>
        </div>
        <?php endif; ?>
    </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Upcoming Installments -->
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">Yaklaşan Taksitler</h3>
            <?php if ($dashboard['overdue_count'] > 0): ?>
            <span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                <?= $dashboard['overdue_count'] ?> gecikmiş
            </span>
            <?php endif; ?>
        </div>

        <?php if (!empty($dashboard['upcoming_installments'])): ?>
        <div class="space-y-3">
            <?php foreach (array_slice($dashboard['upcoming_installments'], 0, 5) as $installment): ?>
            <div class="flex justify-between items-center p-3 <?= is_overdue($installment['due_date']) ? 'bg-red-50' : 'bg-gray-50' ?> rounded-lg">
                <div>
                    <p class="font-medium text-gray-800"><?= esc($installment['party_name']) ?></p>
                    <p class="text-xs text-gray-500">
                        <?= format_date($installment['due_date']) ?>
                        <?php if (is_overdue($installment['due_date'])): ?>
                        <span class="text-red-600 font-medium">(Gecikmiş)</span>
                        <?php endif; ?>
                    </p>
                </div>
                <div class="text-right">
                    <p class="font-semibold <?= $installment['kind'] === 'debt' ? 'text-red-600' : 'text-green-600' ?>">
                        <?= format_currency($installment['amount'], $installment['currency']) ?>
                    </p>
                    <p class="text-xs text-gray-500">
                        <?= $installment['kind'] === 'debt' ? 'Borç' : 'Alacak' ?>
                    </p>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="mt-4">
            <a href="<?= base_url('debts') ?>" class="text-blue-600 hover:text-blue-800 text-sm">Tümünü Gör &rarr;</a>
        </div>
        <?php else: ?>
        <p class="text-gray-500 text-sm">Yaklaşan taksit bulunmuyor.</p>
        <?php endif; ?>
    </div>

    <!-- Recent Transactions -->
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">Son İşlemler</h3>
        </div>

        <?php if (!empty($dashboard['recent_transactions'])): ?>
        <div class="space-y-3">
            <?php foreach ($dashboard['recent_transactions'] as $transaction): ?>
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                    <p class="font-medium text-gray-800">
                        <?= esc($transaction['category_name'] ?? ($transaction['type'] === 'income' ? 'Gelir' : 'Gider')) ?>
                    </p>
                    <p class="text-xs text-gray-500">
                        <?= format_date($transaction['date']) ?>
                        <?php if ($transaction['party_name']): ?>
                        - <?= esc($transaction['party_name']) ?>
                        <?php endif; ?>
                    </p>
                </div>
                <span class="font-semibold <?= $transaction['type'] === 'income' ? 'text-green-600' : 'text-red-600' ?>">
                    <?= $transaction['type'] === 'income' ? '+' : '-' ?><?= format_currency($transaction['net_amount'], $transaction['currency']) ?>
                </span>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="mt-4">
            <a href="<?= base_url('transactions') ?>" class="text-blue-600 hover:text-blue-800 text-sm">Tümünü Gör &rarr;</a>
        </div>
        <?php else: ?>
        <p class="text-gray-500 text-sm">Henüz işlem bulunmuyor.</p>
        <?php endif; ?>
    </div>
</div>

<!-- Active Projects -->
<?php if (!empty($dashboard['active_projects'])): ?>
<div class="mt-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-800">Aktif Projeler</h3>
        <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            <?= $dashboard['active_projects_count'] ?> proje
        </span>
    </div>

    <div class="overflow-x-auto">
        <table class="w-full">
            <thead>
                <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th class="pb-3">Proje</th>
                    <th class="pb-3">Sözleşme</th>
                    <th class="pb-3">Durum</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                <?php foreach (array_slice($dashboard['active_projects'], 0, 5) as $project): ?>
                <tr>
                    <td class="py-3">
                        <a href="<?= base_url('projects/' . $project['id']) ?>" class="font-medium text-gray-800 hover:text-blue-600">
                            <?= esc($project['title']) ?>
                        </a>
                    </td>
                    <td class="py-3">
                        <span class="font-medium"><?= format_currency($project['contract_amount'], $project['currency']) ?></span>
                    </td>
                    <td class="py-3">
                        <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Aktif</span>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <div class="mt-4">
        <a href="<?= base_url('projects') ?>" class="text-blue-600 hover:text-blue-800 text-sm">Tüm Projeler &rarr;</a>
    </div>
</div>
<?php endif; ?>
