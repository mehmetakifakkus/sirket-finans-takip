<?php

namespace Config;

use CodeIgniter\Config\Filters as BaseFilters;
use CodeIgniter\Filters\Cors;
use CodeIgniter\Filters\DebugToolbar;
use CodeIgniter\Filters\ForceHTTPS;
use CodeIgniter\Filters\Honeypot;
use CodeIgniter\Filters\InvalidChars;
use CodeIgniter\Filters\PageCache;
use CodeIgniter\Filters\SecureHeaders;
use App\Filters\AuthFilter;
use App\Filters\AdminFilter;
use App\Filters\CorsFilter;

/**
 * Filters Configuration
 */
class Filters extends BaseFilters
{
    /**
     * Filter aliases
     */
    public array $aliases = [
        'csrf'          => \CodeIgniter\Filters\CSRF::class,
        'toolbar'       => DebugToolbar::class,
        'honeypot'      => Honeypot::class,
        'invalidchars'  => InvalidChars::class,
        'secureheaders' => SecureHeaders::class,
        'forcehttps'    => ForceHTTPS::class,
        'pagecache'     => PageCache::class,
        'auth'          => AuthFilter::class,
        'admin'         => AdminFilter::class,
        'cors'          => CorsFilter::class,
    ];

    /**
     * Required filters
     */
    public array $required = [
        'before' => [
            'forcehttps',
        ],
        'after' => [],
    ];

    /**
     * Global filters
     */
    public array $globals = [
        'before' => [
            'cors',
        ],
        'after' => [],
    ];

    /**
     * Method filters
     */
    public array $methods = [];

    /**
     * Filter arguments
     */
    public array $filters = [];
}
