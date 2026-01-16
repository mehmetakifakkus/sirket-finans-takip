<?php
$isEdit = !empty($party);
$formAction = $isEdit ? base_url('parties/' . $party['id']) : base_url('parties');
?>

<div class="max-w-2xl mx-auto">
    <div class="mb-6">
        <a href="<?= base_url('parties') ?>" class="inline-flex items-center text-gray-600 hover:text-gray-800">
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
                    <label for="type" class="block text-sm font-medium text-gray-700 mb-2">Tip *</label>
                    <select id="type" name="type" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="customer" <?= old('type', $party['type'] ?? '') === 'customer' ? 'selected' : '' ?>>Müşteri</option>
                        <option value="vendor" <?= old('type', $party['type'] ?? '') === 'vendor' ? 'selected' : '' ?>>Tedarikçi</option>
                        <option value="other" <?= old('type', $party['type'] ?? '') === 'other' ? 'selected' : '' ?>>Diğer</option>
                    </select>
                </div>

                <div>
                    <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Ad / Ünvan *</label>
                    <input type="text" id="name" name="name" value="<?= old('name', $party['name'] ?? '') ?>" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="tax_no" class="block text-sm font-medium text-gray-700 mb-2">Vergi No</label>
                        <input type="text" id="tax_no" name="tax_no" value="<?= old('tax_no', $party['tax_no'] ?? '') ?>"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>

                    <div>
                        <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                        <input type="text" id="phone" name="phone" value="<?= old('phone', $party['phone'] ?? '') ?>"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                </div>

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                    <input type="email" id="email" name="email" value="<?= old('email', $party['email'] ?? '') ?>"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div>
                    <label for="address" class="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                    <textarea id="address" name="address" rows="3"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"><?= old('address', $party['address'] ?? '') ?></textarea>
                </div>

                <div>
                    <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                    <textarea id="notes" name="notes" rows="3"
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"><?= old('notes', $party['notes'] ?? '') ?></textarea>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <a href="<?= base_url('parties') ?>" class="px-4 py-2 text-gray-700 hover:text-gray-900">İptal</a>
                <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    <?= $isEdit ? 'Güncelle' : 'Kaydet' ?>
                </button>
            </div>
        </form>
    </div>
</div>
