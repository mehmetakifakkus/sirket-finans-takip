<div class="flex justify-between items-center mb-6">
    <div class="flex items-center space-x-4">
        <a href="<?= base_url('parties') ?>" class="px-3 py-1 rounded-lg <?= empty($currentType) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Tümü</a>
        <a href="<?= base_url('parties?type=customer') ?>" class="px-3 py-1 rounded-lg <?= $currentType === 'customer' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Müşteriler</a>
        <a href="<?= base_url('parties?type=vendor') ?>" class="px-3 py-1 rounded-lg <?= $currentType === 'vendor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Tedarikçiler</a>
        <a href="<?= base_url('parties?type=other') ?>" class="px-3 py-1 rounded-lg <?= $currentType === 'other' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Diğer</a>
    </div>
    <a href="<?= base_url('parties/create') ?>" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Yeni Taraf
    </a>
</div>

<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taraf</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vergi No</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($parties)): ?>
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($parties as $party): ?>
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <p class="font-medium text-gray-900"><?= esc($party['name']) ?></p>
                </td>
                <td class="px-6 py-4">
                    <?php
                    $typeLabel = match($party['type']) {
                        'customer' => ['Müşteri', 'bg-green-100 text-green-800'],
                        'vendor' => ['Tedarikçi', 'bg-blue-100 text-blue-800'],
                        default => ['Diğer', 'bg-gray-100 text-gray-800'],
                    };
                    ?>
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $typeLabel[1] ?>">
                        <?= $typeLabel[0] ?>
                    </span>
                </td>
                <td class="px-6 py-4 text-gray-600"><?= esc($party['tax_no'] ?? '-') ?></td>
                <td class="px-6 py-4 text-gray-600"><?= esc($party['phone'] ?? '-') ?></td>
                <td class="px-6 py-4 text-gray-600"><?= esc($party['email'] ?? '-') ?></td>
                <td class="px-6 py-4 text-right space-x-2">
                    <?php if ($canEdit): ?>
                    <a href="<?= base_url('parties/' . $party['id'] . '/edit') ?>" class="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        Düzenle
                    </a>
                    <?php endif; ?>
                    <?php if ($canDelete): ?>
                    <form action="<?= base_url('parties/' . $party['id']) ?>" method="post" class="inline" onsubmit="return confirmDelete(this)">
                        <?= csrf_field() ?>
                        <input type="hidden" name="_method" value="DELETE">
                        <button type="submit" class="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            Sil
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
