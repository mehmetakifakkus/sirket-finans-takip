<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Transaction Report Card -->
    <a href="<?= base_url('reports/transactions') ?>" class="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
            </div>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">İşlem Raporu</h3>
        <p class="text-sm text-gray-500">Gelir ve gider işlemlerinin detaylı raporu. Tarih, kategori ve taraf bazında filtreleme.</p>
    </a>

    <!-- Debt Report Card -->
    <a href="<?= base_url('reports/debts') ?>" class="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
            <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Borç/Alacak Raporu</h3>
        <p class="text-sm text-gray-500">Açık borç ve alacakların durumu. Vade takibi ve ödeme analizi.</p>
    </a>

    <!-- Project Report Card -->
    <a href="<?= base_url('reports/projects') ?>" class="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                </svg>
            </div>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Proje Raporu</h3>
        <p class="text-sm text-gray-500">Proje bazında finansal durum. Sözleşme ve tahsilat karşılaştırması.</p>
    </a>
</div>

<!-- Quick Summary -->
<div class="mt-8">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Bu Ay Özeti</h3>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p class="text-sm text-gray-500">Toplam Gelir</p>
            <p class="text-xl font-bold text-green-600"><?= format_currency($summary['income'] ?? 0) ?></p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p class="text-sm text-gray-500">Toplam Gider</p>
            <p class="text-xl font-bold text-red-600"><?= format_currency($summary['expense'] ?? 0) ?></p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p class="text-sm text-gray-500">Net Kar/Zarar</p>
            <?php $net = ($summary['income'] ?? 0) - ($summary['expense'] ?? 0); ?>
            <p class="text-xl font-bold <?= $net >= 0 ? 'text-green-600' : 'text-red-600' ?>"><?= format_currency($net) ?></p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p class="text-sm text-gray-500">İşlem Sayısı</p>
            <p class="text-xl font-bold text-gray-800"><?= $summary['count'] ?? 0 ?></p>
        </div>
    </div>
</div>
