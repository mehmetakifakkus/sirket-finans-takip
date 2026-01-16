<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Public routes
$routes->get('login', 'AuthController::login');
$routes->post('login', 'AuthController::attemptLogin');
$routes->get('logout', 'AuthController::logout');

// Protected routes (requires authentication)
$routes->group('', ['filter' => 'auth'], function ($routes) {
    // Dashboard
    $routes->get('/', 'DashboardController::index');
    $routes->get('dashboard', 'DashboardController::index');

    // Parties
    $routes->get('parties', 'PartyController::index');
    $routes->get('parties/create', 'PartyController::create');
    $routes->post('parties', 'PartyController::store');
    $routes->get('parties/(:num)/edit', 'PartyController::edit/$1');
    $routes->put('parties/(:num)', 'PartyController::update/$1');
    $routes->delete('parties/(:num)', 'PartyController::delete/$1');

    // Transactions
    $routes->get('transactions', 'TransactionController::index');
    $routes->get('transactions/create', 'TransactionController::create');
    $routes->post('transactions', 'TransactionController::store');
    $routes->get('transactions/(:num)/edit', 'TransactionController::edit/$1');
    $routes->put('transactions/(:num)', 'TransactionController::update/$1');
    $routes->delete('transactions/(:num)', 'TransactionController::delete/$1');
    $routes->get('transactions/export', 'TransactionController::export');

    // Debts
    $routes->get('debts', 'DebtController::index');
    $routes->get('debts/create', 'DebtController::create');
    $routes->post('debts', 'DebtController::store');
    $routes->get('debts/(:num)', 'DebtController::show/$1');
    $routes->get('debts/(:num)/edit', 'DebtController::edit/$1');
    $routes->put('debts/(:num)', 'DebtController::update/$1');
    $routes->delete('debts/(:num)', 'DebtController::delete/$1');

    // Installments
    $routes->get('debts/(:num)/installments/create', 'InstallmentController::create/$1');
    $routes->post('debts/(:num)/installments', 'InstallmentController::store/$1');
    $routes->get('debts/(:num)/installments/(:num)/edit', 'InstallmentController::edit/$1/$2');
    $routes->put('debts/(:num)/installments/(:num)', 'InstallmentController::update/$1/$2');
    $routes->delete('debts/(:num)/installments/(:num)', 'InstallmentController::delete/$1/$2');
    $routes->get('debts/(:num)/installments/(:num)/pay', 'InstallmentController::pay/$1/$2');
    $routes->post('debts/(:num)/installments/(:num)/pay', 'InstallmentController::recordPayment/$1/$2');

    // Projects
    $routes->get('projects', 'ProjectController::index');
    $routes->get('projects/create', 'ProjectController::create');
    $routes->post('projects', 'ProjectController::store');
    $routes->get('projects/(:num)', 'ProjectController::show/$1');
    $routes->get('projects/(:num)/edit', 'ProjectController::edit/$1');
    $routes->put('projects/(:num)', 'ProjectController::update/$1');
    $routes->delete('projects/(:num)', 'ProjectController::delete/$1');

    // Milestones
    $routes->get('projects/(:num)/milestones/create', 'MilestoneController::create/$1');
    $routes->post('projects/(:num)/milestones', 'MilestoneController::store/$1');
    $routes->get('projects/(:num)/milestones/(:num)/edit', 'MilestoneController::edit/$1/$2');
    $routes->put('projects/(:num)/milestones/(:num)', 'MilestoneController::update/$1/$2');
    $routes->delete('projects/(:num)/milestones/(:num)', 'MilestoneController::delete/$1/$2');

    // Payments
    $routes->get('payments', 'PaymentController::index');
    $routes->delete('payments/(:num)', 'PaymentController::delete/$1');

    // Reports
    $routes->get('reports', 'ReportController::index');
    $routes->get('reports/transactions', 'ReportController::transactions');
    $routes->get('reports/transactions/export', 'ReportController::exportTransactions');
    $routes->get('reports/debts', 'ReportController::debts');
    $routes->get('reports/debts/export', 'ReportController::exportDebts');
    $routes->get('reports/projects', 'ReportController::projects');
    $routes->get('reports/projects/export', 'ReportController::exportProjects');
});

// Admin only routes
$routes->group('', ['filter' => 'auth:admin'], function ($routes) {
    // Users
    $routes->get('users', 'UserController::index');
    $routes->get('users/create', 'UserController::create');
    $routes->post('users', 'UserController::store');
    $routes->get('users/(:num)/edit', 'UserController::edit/$1');
    $routes->put('users/(:num)', 'UserController::update/$1');
    $routes->delete('users/(:num)', 'UserController::delete/$1');

    // Categories
    $routes->get('categories', 'CategoryController::index');
    $routes->get('categories/create', 'CategoryController::create');
    $routes->post('categories', 'CategoryController::store');
    $routes->get('categories/(:num)/edit', 'CategoryController::edit/$1');
    $routes->put('categories/(:num)', 'CategoryController::update/$1');
    $routes->delete('categories/(:num)', 'CategoryController::delete/$1');

    // Exchange Rates
    $routes->get('exchange-rates', 'ExchangeRateController::index');
    $routes->get('exchange-rates/create', 'ExchangeRateController::create');
    $routes->post('exchange-rates', 'ExchangeRateController::store');
    $routes->get('exchange-rates/(:num)/edit', 'ExchangeRateController::edit/$1');
    $routes->put('exchange-rates/(:num)', 'ExchangeRateController::update/$1');
    $routes->delete('exchange-rates/(:num)', 'ExchangeRateController::delete/$1');
    $routes->post('exchange-rates/fetch-tcmb', 'ExchangeRateController::fetchTCMB');
});
