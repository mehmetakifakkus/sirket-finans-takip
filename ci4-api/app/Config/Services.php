<?php

namespace Config;

use CodeIgniter\Config\BaseService;
use App\Libraries\JwtHelper;

/**
 * Services Configuration
 */
class Services extends BaseService
{
    /**
     * JWT Helper Service
     */
    public static function jwt(bool $getShared = true): JwtHelper
    {
        if ($getShared) {
            return static::getSharedInstance('jwt');
        }

        return new JwtHelper();
    }
}
