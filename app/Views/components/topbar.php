<header class="bg-white shadow-sm border-b border-gray-200">
    <div class="flex items-center justify-between px-6 py-4">
        <!-- Page Title -->
        <div>
            <h2 class="text-xl font-semibold text-gray-800"><?= esc($title ?? 'Dashboard') ?></h2>
        </div>

        <!-- Right Side -->
        <div class="flex items-center space-x-4">
            <!-- Quick Actions -->
            <div class="hidden md:flex items-center space-x-2">
                <a href="<?= base_url('transactions/create?type=income') ?>" class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Gelir
                </a>
                <a href="<?= base_url('transactions/create?type=expense') ?>" class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                    </svg>
                    Gider
                </a>
            </div>

            <!-- User Menu -->
            <div x-data="{ open: false }" class="relative">
                <button @click="open = !open" class="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                    <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        <?= strtoupper(substr($currentUser['name'] ?? 'U', 0, 1)) ?>
                    </div>
                    <span class="hidden md:block text-sm font-medium"><?= esc($currentUser['name'] ?? 'Kullanıcı') ?></span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                <div x-show="open" @click.away="open = false" x-cloak
                     class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                    <div class="px-4 py-2 border-b border-gray-100">
                        <p class="text-sm font-medium text-gray-900"><?= esc($currentUser['name'] ?? '') ?></p>
                        <p class="text-xs text-gray-500"><?= esc($currentUser['email'] ?? '') ?></p>
                        <span class="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full <?= ($currentUser['role'] ?? '') === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800' ?>">
                            <?= ($currentUser['role'] ?? '') === 'admin' ? 'Admin' : 'Personel' ?>
                        </span>
                    </div>
                    <a href="<?= base_url('logout') ?>" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <span class="flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                            </svg>
                            Çıkış Yap
                        </span>
                    </a>
                </div>
            </div>
        </div>
    </div>
</header>
