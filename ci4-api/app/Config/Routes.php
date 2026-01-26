<?php

namespace Config;

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Default route settings
$routes->setDefaultNamespace('App\Controllers');
$routes->setDefaultController('Home');
$routes->setDefaultMethod('index');
$routes->setTranslateURIDashes(false);
$routes->set404Override();
$routes->setAutoRoute(false);

/*
 * API Routes
 */
$routes->group('api', function ($routes) {

    // ========================================
    // Auth Routes (Public)
    // ========================================
    $routes->post('auth/login', 'AuthController::login');

    // ========================================
    // Setup Routes (Public - for initial setup)
    // ========================================
    $routes->get('setup/check', 'SetupController::check');
    $routes->post('setup/initialize', 'SetupController::initialize');
    $routes->post('setup/create-admin', 'SetupController::createAdmin');
    $routes->post('setup/seed-categories', 'SetupController::seedCategories');
    $routes->post('setup/seed-rates', 'SetupController::seedRates');
    $routes->post('setup/seed-demo', 'SetupController::seedDemo');

    // ========================================
    // Auth Routes (Protected)
    // ========================================
    $routes->group('auth', ['filter' => 'auth'], function ($routes) {
        $routes->post('logout', 'AuthController::logout');
        $routes->get('me', 'AuthController::me');
    });

    // ========================================
    // Protected Routes (Require Authentication)
    // ========================================
    $routes->group('', ['filter' => 'auth'], function ($routes) {

        // Transactions
        $routes->get('transactions', 'TransactionController::index');
        $routes->get('transactions/unassigned', 'TransactionController::unassigned');
        $routes->get('transactions/export/csv', 'TransactionController::export');
        $routes->get('transactions/(:num)', 'TransactionController::show/$1');
        $routes->post('transactions', 'TransactionController::create');
        $routes->put('transactions/(:num)', 'TransactionController::update/$1');
        $routes->delete('transactions/(:num)', 'TransactionController::delete/$1');
        $routes->post('transactions/assign', 'TransactionController::assignToProject');

        // Debts
        $routes->get('debts', 'DebtController::index');
        $routes->get('debts/export/csv', 'DebtController::export');
        $routes->get('debts/(:num)', 'DebtController::show/$1');
        $routes->post('debts', 'DebtController::create');
        $routes->put('debts/(:num)', 'DebtController::update/$1');
        $routes->delete('debts/(:num)', 'DebtController::delete/$1');
        $routes->post('debts/(:num)/installments', 'DebtController::createInstallments/$1');

        // Installments
        $routes->get('installments/(:num)', 'InstallmentController::show/$1');
        $routes->put('installments/(:num)', 'InstallmentController::update/$1');
        $routes->delete('installments/(:num)', 'InstallmentController::delete/$1');
        $routes->post('installments/(:num)/pay', 'InstallmentController::pay/$1');

        // Parties
        $routes->get('parties', 'PartyController::index');
        $routes->get('parties/(:num)', 'PartyController::show/$1');
        $routes->post('parties', 'PartyController::create');
        $routes->put('parties/(:num)', 'PartyController::update/$1');
        $routes->delete('parties/(:num)', 'PartyController::delete/$1');
        $routes->post('parties/merge', 'PartyController::merge');

        // Categories
        $routes->get('categories', 'CategoryController::index');
        $routes->get('categories/(:num)', 'CategoryController::show/$1');
        $routes->post('categories', 'CategoryController::create');
        $routes->put('categories/(:num)', 'CategoryController::update/$1');
        $routes->delete('categories/(:num)', 'CategoryController::delete/$1');
        $routes->post('categories/merge', 'CategoryController::merge');

        // Projects
        $routes->get('projects', 'ProjectController::index');
        $routes->get('projects/incomplete-count', 'ProjectController::incompleteCount');
        $routes->get('projects/(:num)', 'ProjectController::show/$1');
        $routes->post('projects', 'ProjectController::create');
        $routes->put('projects/(:num)', 'ProjectController::update/$1');
        $routes->delete('projects/(:num)', 'ProjectController::delete/$1');

        // Milestones
        $routes->get('milestones/(:num)', 'MilestoneController::show/$1');
        $routes->post('milestones', 'MilestoneController::create');
        $routes->put('milestones/(:num)', 'MilestoneController::update/$1');
        $routes->delete('milestones/(:num)', 'MilestoneController::delete/$1');

        // Grants
        $routes->get('grants', 'GrantController::index');
        $routes->get('grants/totals', 'GrantController::totals');
        $routes->get('grants/(:num)', 'GrantController::show/$1');
        $routes->post('grants', 'GrantController::create');
        $routes->post('grants/calculate', 'GrantController::calculate');
        $routes->put('grants/(:num)', 'GrantController::update/$1');
        $routes->delete('grants/(:num)', 'GrantController::delete/$1');

        // Payments
        $routes->get('payments', 'PaymentController::index');
        $routes->delete('payments/(:num)', 'PaymentController::delete/$1');

        // Exchange Rates
        $routes->get('exchange-rates', 'ExchangeRateController::index');
        $routes->get('exchange-rates/latest', 'ExchangeRateController::latest');
        $routes->get('exchange-rates/(:num)', 'ExchangeRateController::show/$1');
        $routes->post('exchange-rates', 'ExchangeRateController::create');
        $routes->post('exchange-rates/fetch-tcmb', 'ExchangeRateController::fetchTcmb');
        $routes->post('exchange-rates/fetch-gold', 'ExchangeRateController::fetchGold');
        $routes->put('exchange-rates/(:num)', 'ExchangeRateController::update/$1');
        $routes->delete('exchange-rates/(:num)', 'ExchangeRateController::delete/$1');

        // Reports
        $routes->get('reports/dashboard', 'ReportController::dashboard');
        $routes->get('reports/summary', 'ReportController::summary');
        $routes->get('reports/transactions', 'ReportController::transactions');
        $routes->get('reports/debts', 'ReportController::debts');
        $routes->get('reports/projects', 'ReportController::projects');
        $routes->get('reports/export', 'ReportController::export');

        // Documents
        $routes->get('documents', 'DocumentController::index');
        $routes->get('documents/count', 'DocumentController::count');
        $routes->get('documents/(:num)', 'DocumentController::show/$1');
        $routes->get('documents/(:num)/preview', 'DocumentController::preview/$1');
        $routes->post('documents', 'DocumentController::create');
        $routes->delete('documents/(:num)', 'DocumentController::delete/$1');

        // Files
        $routes->get('files', 'FileController::index');
        $routes->get('files/(:num)', 'FileController::show/$1');
        $routes->get('files/(:num)/open', 'FileController::open/$1');
        $routes->post('files', 'FileController::create');
        $routes->delete('files/(:num)', 'FileController::delete/$1');

        // Import
        $routes->post('import/preview', 'ImportController::preview');
        $routes->post('import/transactions', 'ImportController::transactions');
        $routes->post('import/parties', 'ImportController::parties');
        $routes->post('import/categories', 'ImportController::categories');

        // Database (stats only for regular users)
        $routes->get('database/stats', 'DatabaseController::stats');
        $routes->get('database/export', 'DatabaseController::export');
    });

    // ========================================
    // Admin Only Routes
    // ========================================
    $routes->group('', ['filter' => 'admin'], function ($routes) {
        // Users
        $routes->get('users', 'UserController::index');
        $routes->get('users/(:num)', 'UserController::show/$1');
        $routes->post('users', 'UserController::create');
        $routes->put('users/(:num)', 'UserController::update/$1');
        $routes->delete('users/(:num)', 'UserController::delete/$1');

        // Database management
        $routes->post('database/backup', 'DatabaseController::backup');
        $routes->post('database/restore', 'DatabaseController::restore');
        $routes->post('database/clear', 'DatabaseController::clear');
    });
});

// Options handler for CORS
$routes->options('api/(:any)', static function () {
    return service('response')->setStatusCode(204);
});
