<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= esc($title ?? 'Şirket Finans Takip') ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#1e40af',
                        secondary: '#64748b',
                    }
                }
            }
        }
    </script>
    <style>
        [x-cloak] { display: none !important; }
    </style>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="flex min-h-screen">
        <!-- Sidebar -->
        <?= $this->include('components/sidebar') ?>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col">
            <!-- Topbar -->
            <?= $this->include('components/topbar') ?>

            <!-- Page Content -->
            <main class="flex-1 p-6">
                <!-- Alerts -->
                <?= $this->include('components/alert') ?>

                <!-- Content -->
                <?= $content ?>
            </main>
        </div>
    </div>

    <!-- Modal Container -->
    <div id="modal-container"></div>

    <script>
        // Global helper functions
        function confirmDelete(form, message) {
            if (confirm(message || 'Bu kaydı silmek istediğinizden emin misiniz?')) {
                form.submit();
            }
            return false;
        }

        // Number formatting for inputs
        document.querySelectorAll('input[data-type="currency"]').forEach(input => {
            input.addEventListener('blur', function() {
                let value = this.value.replace(/[^\d,.-]/g, '');
                this.value = value;
            });
        });
    </script>
</body>
</html>
