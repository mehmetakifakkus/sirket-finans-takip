<?php

/**
 * CodeIgniter 4 Bootstrap (Simplified Version)
 * This is a minimal bootstrap for the API
 */

// Load constants
require_once APPPATH . 'Config/Constants.php';

// Composer autoloader
$composerPath = ROOTPATH . 'vendor/autoload.php';
if (file_exists($composerPath)) {
    require_once $composerPath;
}

// Custom autoloader for App namespace
spl_autoload_register(function ($class) {
    // App namespace
    if (strpos($class, 'App\\') === 0) {
        $relativePath = str_replace('App\\', '', $class);
        $relativePath = str_replace('\\', DIRECTORY_SEPARATOR, $relativePath);
        $file = APPPATH . $relativePath . '.php';
        if (file_exists($file)) {
            require_once $file;
            return true;
        }
    }

    // Config namespace
    if (strpos($class, 'Config\\') === 0) {
        $relativePath = str_replace('Config\\', 'Config/', $class);
        $relativePath = str_replace('\\', DIRECTORY_SEPARATOR, $relativePath);
        $file = APPPATH . str_replace('Config/', '', $relativePath) . '.php';
        if (file_exists($file)) {
            require_once $file;
            return true;
        }
    }

    // CodeIgniter namespace - load from system
    if (strpos($class, 'CodeIgniter\\') === 0) {
        $relativePath = str_replace('CodeIgniter\\', '', $class);
        $relativePath = str_replace('\\', DIRECTORY_SEPARATOR, $relativePath);
        $file = SYSTEMPATH . $relativePath . '.php';
        if (file_exists($file)) {
            require_once $file;
            return true;
        }
    }

    return false;
});

/**
 * Load environment variables
 */
function loadEnv() {
    $envFile = ROOTPATH . '.env';
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
}

loadEnv();
