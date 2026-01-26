<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

/**
 * Application Configuration
 */
class App extends BaseConfig
{
    /**
     * Base URL
     */
    public string $baseURL = 'http://localhost/ci4-api/public/';

    /**
     * Allowed hostnames
     */
    public array $allowedHostnames = [];

    /**
     * Index file
     */
    public string $indexPage = '';

    /**
     * URI Protocol
     */
    public string $uriProtocol = 'REQUEST_URI';

    /**
     * Default Locale
     */
    public string $defaultLocale = 'tr';

    /**
     * Negotiate Locale
     */
    public bool $negotiateLocale = false;

    /**
     * Supported Locales
     */
    public array $supportedLocales = ['tr', 'en', 'de'];

    /**
     * Application Timezone
     */
    public string $appTimezone = 'Europe/Istanbul';

    /**
     * Charset
     */
    public string $charset = 'UTF-8';

    /**
     * Force Global Secure Requests
     */
    public bool $forceGlobalSecureRequests = false;

    /**
     * Reverse Proxy IPs
     */
    public array $proxyIPs = [];

    /**
     * Content Security Policy
     */
    public bool $CSPEnabled = false;
}
