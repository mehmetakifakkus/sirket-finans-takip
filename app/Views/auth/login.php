<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Giriş - Şirket Finans Takip</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-900 to-blue-700 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <div class="bg-white rounded-2xl shadow-xl p-8">
            <!-- Logo -->
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800">Finans Takip</h1>
                <p class="text-gray-500 mt-2">Şirket Yönetim Sistemi</p>
            </div>

            <!-- Alerts -->
            <?php if (session()->getFlashdata('error')): ?>
            <div class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                <?= esc(session()->getFlashdata('error')) ?>
            </div>
            <?php endif; ?>

            <?php if (session()->getFlashdata('success')): ?>
            <div class="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
                <?= esc(session()->getFlashdata('success')) ?>
            </div>
            <?php endif; ?>

            <?php if (session()->getFlashdata('errors')): ?>
            <div class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                <ul class="list-disc list-inside">
                    <?php foreach (session()->getFlashdata('errors') as $error): ?>
                        <li><?= esc($error) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <?php endif; ?>

            <!-- Login Form -->
            <form action="<?= base_url('login') ?>" method="post">
                <?= csrf_field() ?>

                <div class="mb-4">
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">E-posta Adresi</label>
                    <input type="email" id="email" name="email" value="<?= old('email') ?>" required
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="ornek@sirket.com">
                </div>

                <div class="mb-6">
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
                    <input type="password" id="password" name="password" required
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="••••••••">
                </div>

                <button type="submit"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200">
                    Giriş Yap
                </button>
            </form>

            <!-- Demo Info -->
            <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                <p class="text-xs text-gray-500 text-center mb-2">Demo Hesapları</p>
                <div class="text-xs text-gray-600 space-y-1">
                    <p><strong>Admin:</strong> admin@sirket.com / admin123</p>
                    <p><strong>Personel:</strong> staff@sirket.com / staff123</p>
                </div>
            </div>
        </div>

        <p class="text-center text-white/60 text-sm mt-6">
            Şirket Finans Takip v1.0
        </p>
    </div>
</body>
</html>
