<?php

namespace Config;

use CodeIgniter\Database\Config;

/**
 * Database Configuration
 */
class Database extends Config
{
    /**
     * Default database group
     */
    public string $defaultGroup = 'default';

    /**
     * Default database connection
     */
    public array $default = [
        'DSN'          => '',
        'hostname'     => 'localhost',
        'username'     => 'root',
        'password'     => '',
        'database'     => 'sirket_finans',
        'DBDriver'     => 'MySQLi',
        'DBPrefix'     => '',
        'pConnect'     => false,
        'DBDebug'      => true,
        'charset'      => 'utf8mb4',
        'DBCollat'     => 'utf8mb4_unicode_ci',
        'swapPre'      => '',
        'encrypt'      => false,
        'compress'     => false,
        'strictOn'     => false,
        'failover'     => [],
        'port'         => 3306,
        'numberConnect' => false,
        'dateFormat'   => [
            'date'     => 'Y-m-d',
            'datetime' => 'Y-m-d H:i:s',
            'time'     => 'H:i:s',
        ],
    ];

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();

        // Load from environment if available
        if (getenv('database.default.hostname')) {
            $this->default['hostname'] = getenv('database.default.hostname');
        }
        if (getenv('database.default.database')) {
            $this->default['database'] = getenv('database.default.database');
        }
        if (getenv('database.default.username')) {
            $this->default['username'] = getenv('database.default.username');
        }
        if (getenv('database.default.password')) {
            $this->default['password'] = getenv('database.default.password');
        }
        if (getenv('database.default.port')) {
            $this->default['port'] = (int) getenv('database.default.port');
        }

        // Debug mode based on environment
        $this->default['DBDebug'] = (getenv('CI_ENVIRONMENT') !== 'production');
    }
}
