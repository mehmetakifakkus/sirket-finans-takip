<div class="flex justify-between items-center mb-6">
    <div class="flex items-center space-x-4">
        <a href="<?= base_url('payments') ?>" class="px-3 py-1 rounded-lg <?= empty($currentMethod) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Tümü</a>
        <a href="<?= base_url('payments?method=cash') ?>" class="px-3 py-1 rounded-lg <?= $currentMethod === 'cash' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Nakit</a>
        <a href="<?= base_url('payments?method=bank') ?>" class="px-3 py-1 rounded-lg <?= $currentMethod === 'bank' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Banka</a>
        <a href="<?= base_url('payments?method=card') ?>" class="px-3 py-1 rounded-lg <?= $currentMethod === 'card' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Kart</a>
    </div>
</div>

<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İlişkili</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yöntem</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Not</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($payments)): ?>
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($payments as $payment): ?>
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-gray-600"><?= format_date($payment['date']) ?></td>
                <td class="px-6 py-4">
                    <?php
                    $relatedLabel = match($payment['related_type']) {
                        'installment' => 'Taksit',
                        'debt' => 'Borç/Alacak',
                        'milestone' => 'Milestone',
                        default => $payment['related_type'],
                    };
                    ?>
                    <span class="text-gray-900"><?= $relatedLabel ?></span>
                    <?php if (!empty($payment['party_name'])): ?>
                    <p class="text-xs text-gray-500"><?= esc($payment['party_name']) ?></p>
                    <?php endif; ?>
                </td>
                <td class="px-6 py-4 text-right font-medium text-gray-900"><?= format_currency($payment['amount'], $payment['currency']) ?></td>
                <td class="px-6 py-4">
                    <?php
                    $methodClass = match($payment['method']) {
                        'cash' => 'bg-green-100 text-green-800',
                        'bank' => 'bg-blue-100 text-blue-800',
                        'card' => 'bg-purple-100 text-purple-800',
                        default => 'bg-gray-100 text-gray-800',
                    };
                    $methodLabel = match($payment['method']) {
                        'cash' => 'Nakit',
                        'bank' => 'Banka',
                        'card' => 'Kart',
                        'other' => 'Diğer',
                        default => $payment['method'],
                    };
                    ?>
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $methodClass ?>"><?= $methodLabel ?></span>
                </td>
                <td class="px-6 py-4 text-gray-600 text-sm"><?= esc($payment['notes'] ?? '-') ?></td>
                <td class="px-6 py-4 text-right">
                    <?php if ($canDelete): ?>
                    <form action="<?= base_url('payments/' . $payment['id']) ?>" method="post" class="inline" onsubmit="return confirmDelete(this)">
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
