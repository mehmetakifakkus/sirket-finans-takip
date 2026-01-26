<?php

/*
 | Application Constants
 */

defined('APP_NAMESPACE') || define('APP_NAMESPACE', 'App');
defined('ROOTPATH')      || define('ROOTPATH', realpath(APPPATH . '..') . DIRECTORY_SEPARATOR);
defined('APPPATH')       || define('APPPATH', realpath(__DIR__ . '/..') . DIRECTORY_SEPARATOR);
defined('WRITEPATH')     || define('WRITEPATH', realpath(APPPATH . '../writable') . DIRECTORY_SEPARATOR);
defined('FCPATH')        || define('FCPATH', realpath(APPPATH . '../public') . DIRECTORY_SEPARATOR);
defined('SYSTEMPATH')    || define('SYSTEMPATH', realpath(APPPATH . '../system') . DIRECTORY_SEPARATOR);

/*
 | Exit Status Codes
 */
defined('EXIT_SUCCESS')        || define('EXIT_SUCCESS', 0);
defined('EXIT_ERROR')          || define('EXIT_ERROR', 1);
defined('EXIT_CONFIG')         || define('EXIT_CONFIG', 3);
defined('EXIT_UNKNOWN_FILE')   || define('EXIT_UNKNOWN_FILE', 4);
defined('EXIT_UNKNOWN_CLASS')  || define('EXIT_UNKNOWN_CLASS', 5);
defined('EXIT_UNKNOWN_METHOD') || define('EXIT_UNKNOWN_METHOD', 6);
defined('EXIT_USER_INPUT')     || define('EXIT_USER_INPUT', 7);
defined('EXIT_DATABASE')       || define('EXIT_DATABASE', 8);
defined('EXIT__AUTO_MIN')      || define('EXIT__AUTO_MIN', 9);
defined('EXIT__AUTO_MAX')      || define('EXIT__AUTO_MAX', 125);

/*
 | HTTP Status Codes
 */
defined('HTTP_OK')                    || define('HTTP_OK', 200);
defined('HTTP_CREATED')               || define('HTTP_CREATED', 201);
defined('HTTP_NO_CONTENT')            || define('HTTP_NO_CONTENT', 204);
defined('HTTP_BAD_REQUEST')           || define('HTTP_BAD_REQUEST', 400);
defined('HTTP_UNAUTHORIZED')          || define('HTTP_UNAUTHORIZED', 401);
defined('HTTP_FORBIDDEN')             || define('HTTP_FORBIDDEN', 403);
defined('HTTP_NOT_FOUND')             || define('HTTP_NOT_FOUND', 404);
defined('HTTP_METHOD_NOT_ALLOWED')    || define('HTTP_METHOD_NOT_ALLOWED', 405);
defined('HTTP_CONFLICT')              || define('HTTP_CONFLICT', 409);
defined('HTTP_UNPROCESSABLE_ENTITY')  || define('HTTP_UNPROCESSABLE_ENTITY', 422);
defined('HTTP_INTERNAL_SERVER_ERROR') || define('HTTP_INTERNAL_SERVER_ERROR', 500);

/*
 | Application Constants
 */
defined('UPLOAD_PATH')     || define('UPLOAD_PATH', WRITEPATH . 'uploads/');
defined('BACKUP_PATH')     || define('BACKUP_PATH', WRITEPATH . 'backups/');
defined('UPLOAD_MAX_SIZE') || define('UPLOAD_MAX_SIZE', 10 * 1024 * 1024); // 10MB
