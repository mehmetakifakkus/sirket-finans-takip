<?php

/**
 * CodeIgniter 4 Entry Point
 * Şirket Finans Takip API
 */

// Valid PHP Version?
$minPHPVersion = '8.1';
if (version_compare(PHP_VERSION, $minPHPVersion, '<')) {
    $message = sprintf('PHP %s veya daha yeni bir sürüm gerekli. Mevcut sürüm: %s', $minPHPVersion, PHP_VERSION);
    header('HTTP/1.1 503 Service Unavailable', true, 503);
    echo $message;
    exit(1);
}

// Path to the front controller
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);

// Ensure the current directory is pointing to the front controller's directory
if (getcwd() . DIRECTORY_SEPARATOR !== FCPATH) {
    chdir(FCPATH);
}

// Load environment
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B'\"");
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

// Define paths
define('ROOTPATH', dirname(__DIR__) . DIRECTORY_SEPARATOR);
define('APPPATH', ROOTPATH . 'app' . DIRECTORY_SEPARATOR);
define('WRITEPATH', ROOTPATH . 'writable' . DIRECTORY_SEPARATOR);
define('SYSTEMPATH', ROOTPATH . 'vendor/codeigniter4/framework/system' . DIRECTORY_SEPARATOR);

// Composer autoloader (load for dependencies)
$composerPath = ROOTPATH . 'vendor/autoload.php';
if (file_exists($composerPath)) {
    require_once $composerPath;
}

// Use SimpleRouter for API (more stable for REST API)
require_once ROOTPATH . 'system/SimpleRouter.php';
