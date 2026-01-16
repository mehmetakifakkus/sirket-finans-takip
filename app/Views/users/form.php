<?php
$isEdit = !empty($user);
$formAction = $isEdit ? base_url('users/' . $user['id']) : base_url('users');
?>

<div class="max-w-2xl mx-auto">
    <div class="mb-6">
        <a href="<?= base_url('users') ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Geri
        </a>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form action="<?= $formAction ?>" method="post">
            <?= csrf_field() ?>
            <?php if ($isEdit): ?>
            <input type="hidden" name="_method" value="PUT">
            <?php endif; ?>

            <div class="space-y-6">
                <div>
                    <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Ad Soyad *</label>
                    <input type="text" id="name" name="name" value="<?= old('name', $user['name'] ?? '') ?>" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">E-posta *</label>
                    <input type="email" id="email" name="email" value="<?= old('email', $user['email'] ?? '') ?>" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                        Şifre <?= $isEdit ? '(Değiştirmek için doldurun)' : '*' ?>
                    </label>
                    <input type="password" id="password" name="password" <?= $isEdit ? '' : 'required' ?>
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="<?= $isEdit ? '••••••••' : '' ?>">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="role" class="block text-sm font-medium text-gray-700 mb-2">Rol *</label>
                        <select id="role" name="role" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="staff" <?= old('role', $user['role'] ?? '') === 'staff' ? 'selected' : '' ?>>Personel</option>
                            <option value="admin" <?= old('role', $user['role'] ?? '') === 'admin' ? 'selected' : '' ?>>Admin</option>
                        </select>
                    </div>

                    <div>
                        <label for="status" class="block text-sm font-medium text-gray-700 mb-2">Durum *</label>
                        <select id="status" name="status" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="active" <?= old('status', $user['status'] ?? 'active') === 'active' ? 'selected' : '' ?>>Aktif</option>
                            <option value="inactive" <?= old('status', $user['status'] ?? '') === 'inactive' ? 'selected' : '' ?>>Pasif</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <a href="<?= base_url('users') ?>" class="px-4 py-2 text-gray-700 hover:text-gray-900">İptal</a>
                <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    <?= $isEdit ? 'Güncelle' : 'Kaydet' ?>
                </button>
            </div>
        </form>
    </div>
</div>
