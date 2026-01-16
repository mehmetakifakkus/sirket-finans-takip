<div class="flex justify-between items-center mb-6">
    <div class="flex items-center space-x-4">
        <a href="<?= base_url('categories') ?>" class="px-3 py-1 rounded-lg <?= empty($currentType) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Tümü</a>
        <a href="<?= base_url('categories?type=income') ?>" class="px-3 py-1 rounded-lg <?= $currentType === 'income' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Gelir</a>
        <a href="<?= base_url('categories?type=expense') ?>" class="px-3 py-1 rounded-lg <?= $currentType === 'expense' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' ?>">Gider</a>
    </div>
    <a href="<?= base_url('categories/create') ?>" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Yeni Kategori
    </a>
</div>

<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($categories)): ?>
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($categories as $category): ?>
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <p class="font-medium text-gray-900"><?= esc($category['name']) ?></p>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $category['type'] === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' ?>">
                        <?= $category['type'] === 'income' ? 'Gelir' : 'Gider' ?>
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $category['is_active'] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800' ?>">
                        <?= $category['is_active'] ? 'Aktif' : 'Pasif' ?>
                    </span>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                    <a href="<?= base_url('categories/' . $category['id'] . '/edit') ?>" class="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800">Düzenle</a>
                    <form action="<?= base_url('categories/' . $category['id']) ?>" method="post" class="inline" onsubmit="return confirmDelete(this)">
                        <?= csrf_field() ?>
                        <input type="hidden" name="_method" value="DELETE">
                        <button type="submit" class="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800">Sil</button>
                    </form>
                </td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>
