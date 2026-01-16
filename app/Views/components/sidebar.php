<aside class="w-64 bg-gray-900 text-white flex flex-col">
    <!-- Logo -->
    <div class="p-4 border-b border-gray-800">
        <h1 class="text-xl font-bold">Finans Takip</h1>
        <p class="text-xs text-gray-400 mt-1">Şirket Yönetim Sistemi</p>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <!-- Dashboard -->
        <a href="<?= base_url('/') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 <?= uri_string() === '' || uri_string() === 'dashboard' ? 'bg-gray-800' : '' ?>">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            Dashboard
        </a>

        <!-- İşlemler -->
        <div class="pt-4">
            <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</p>
        </div>

        <a href="<?= base_url('transactions') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 <?= str_starts_with(uri_string(), 'transactions') ? 'bg-gray-800' : '' ?>">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Gelir / Gider
        </a>

        <a href="<?= base_url('transactions/create?type=income') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 text-green-400 text-sm ml-4">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Yeni Gelir
        </a>

        <a href="<?= base_url('transactions/create?type=expense') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 text-red-400 text-sm ml-4">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
            </svg>
            Yeni Gider
        </a>

        <!-- Borç / Alacak -->
        <div class="pt-4">
            <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Borç / Alacak</p>
        </div>

        <a href="<?= base_url('debts') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 <?= str_starts_with(uri_string(), 'debts') || str_starts_with(uri_string(), 'installments') ? 'bg-gray-800' : '' ?>">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
            Borç / Alacak
        </a>

        <a href="<?= base_url('payments') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 <?= str_starts_with(uri_string(), 'payments') ? 'bg-gray-800' : '' ?>">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            Ödemeler
        </a>

        <!-- Projeler -->
        <div class="pt-4">
            <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projeler</p>
        </div>

        <a href="<?= base_url('projects') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 <?= str_starts_with(uri_string(), 'projects') || str_starts_with(uri_string(), 'milestones') ? 'bg-gray-800' : '' ?>">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Projeler
        </a>

        <!-- Taraflar -->
        <div class="pt-4">
            <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kayıtlar</p>
        </div>

        <a href="<?= base_url('parties') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 <?= str_starts_with(uri_string(), 'parties') ? 'bg-gray-800' : '' ?>">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            Taraflar
        </a>

        <!-- Raporlar -->
        <div class="pt-4">
            <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Raporlar</p>
        </div>

        <a href="<?= base_url('reports') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 <?= str_starts_with(uri_string(), 'reports') ? 'bg-gray-800' : '' ?>">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Raporlar
        </a>

        <?php if (isset($isAdmin) && $isAdmin): ?>
        <!-- Ayarlar (Admin Only) -->
        <div class="pt-4">
            <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ayarlar</p>
        </div>

        <a href="<?= base_url('categories') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 <?= str_starts_with(uri_string(), 'categories') ? 'bg-gray-800' : '' ?>">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
            </svg>
            Kategoriler
        </a>

        <a href="<?= base_url('exchange-rates') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 <?= str_starts_with(uri_string(), 'exchange-rates') ? 'bg-gray-800' : '' ?>">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
            Döviz Kurları
        </a>

        <a href="<?= base_url('users') ?>" class="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 <?= str_starts_with(uri_string(), 'users') ? 'bg-gray-800' : '' ?>">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
            Kullanıcılar
        </a>
        <?php endif; ?>
    </nav>

    <!-- Footer -->
    <div class="p-4 border-t border-gray-800 text-xs text-gray-500">
        Şirket Finans Takip v1.0
    </div>
</aside>
