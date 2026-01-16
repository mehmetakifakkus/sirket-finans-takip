<div class="flex justify-between items-center mb-6">
    <div>
        <p class="text-gray-600">Sistemdeki kullanıcıları yönetin</p>
    </div>
    <a href="<?= base_url('users/create') ?>" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Yeni Kullanıcı
    </a>
</div>

<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <?php if (empty($users)): ?>
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
            </tr>
            <?php else: ?>
            <?php foreach ($users as $user): ?>
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                            <?= strtoupper(substr($user['name'], 0, 1)) ?>
                        </div>
                        <div class="ml-3">
                            <p class="font-medium text-gray-900"><?= esc($user['name']) ?></p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-600"><?= esc($user['email']) ?></td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $user['role'] === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800' ?>">
                        <?= $user['role'] === 'admin' ? 'Admin' : 'Personel' ?>
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full <?= $user['status'] === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' ?>">
                        <?= $user['status'] === 'active' ? 'Aktif' : 'Pasif' ?>
                    </span>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                    <a href="<?= base_url('users/' . $user['id'] . '/edit') ?>" class="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        Düzenle
                    </a>
                    <?php if ($user['id'] != session()->get('user_id')): ?>
                    <form action="<?= base_url('users/' . $user['id']) ?>" method="post" class="inline" onsubmit="return confirmDelete(this)">
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
