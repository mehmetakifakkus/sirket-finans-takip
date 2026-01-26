<?php

namespace Config;

/**
 * Paths Configuration
 */
class Paths
{
    /**
     * The path to the application directory
     */
    public string $appDirectory = __DIR__ . '/..';

    /**
     * The path to the system directory (CodeIgniter core)
     */
    public string $systemDirectory = __DIR__ . '/../../system';

    /**
     * The path to the writable directory
     */
    public string $writableDirectory = __DIR__ . '/../../writable';

    /**
     * The path to the tests directory
     */
    public string $testsDirectory = __DIR__ . '/../../tests';
}
