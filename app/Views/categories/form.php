<?php
$isEdit = !empty($category);
$formAction = $isEdit ? base_url('categories/' . $category['id']) : base_url('categories');
?>

<div class="max-w-xl mx-auto">
    <div class="mb-6">
        <a href="<?= base_url('categories') ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
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
                    <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Kategori Adı *</label>
                    <input type="text" id="name" name="name" value="<?= old('name', $category['name'] ?? '') ?>" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div>
                    <label for="type" class="block text-sm font-medium text-gray-700 mb-2">Tip *</label>
                    <select id="type" name="type" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="income" <?= old('type', $category['type'] ?? '') === 'income' ? 'selected' : '' ?>>Gelir</option>
                        <option value="expense" <?= old('type', $category['type'] ?? '') === 'expense' ? 'selected' : '' ?>>Gider</option>
                    </select>
                </div>

                <div>
                    <label for="parent_id" class="block text-sm font-medium text-gray-700 mb-2">Üst Kategori</label>
                    <select id="parent_id" name="parent_id"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Yok (Ana Kategori)</option>
                        <?php foreach ($parentCategories as $parent): ?>
                        <option value="<?= $parent['id'] ?>" <?= old('parent_id', $category['parent_id'] ?? '') == $parent['id'] ? 'selected' : '' ?>>
                            <?= esc($parent['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label class="flex items-center">
                        <input type="checkbox" name="is_active" value="1" <?= old('is_active', $category['is_active'] ?? 1) ? 'checked' : '' ?>
                               class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="ml-2 text-sm text-gray-700">Aktif</span>
                    </label>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <a href="<?= base_url('categories') ?>" class="px-4 py-2 text-gray-700 hover:text-gray-900">İptal</a>
                <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    <?= $isEdit ? 'Güncelle' : 'Kaydet' ?>
                </button>
            </div>
        </form>
    </div>
</div>
