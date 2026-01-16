<?php

namespace App\Controllers;

use App\Services\AuthService;

class AuthController extends BaseController
{
    protected AuthService $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    /**
     * Show login page
     */
    public function login()
    {
        // If already logged in, redirect to dashboard
        if ($this->authService->isLoggedIn()) {
            return redirect()->to('/dashboard');
        }

        return view('auth/login');
    }

    /**
     * Process login attempt
     */
    public function attemptLogin()
    {
        $rules = [
            'email'    => 'required|valid_email',
            'password' => 'required|min_length[6]',
        ];

        $messages = [
            'email' => [
                'required'    => 'E-posta adresi zorunludur.',
                'valid_email' => 'Geçerli bir e-posta adresi giriniz.',
            ],
            'password' => [
                'required'   => 'Şifre zorunludur.',
                'min_length' => 'Şifre en az 6 karakter olmalıdır.',
            ],
        ];

        if (!$this->validate($rules, $messages)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $email = $this->request->getPost('email');
        $password = $this->request->getPost('password');

        $result = $this->authService->attemptLogin($email, $password);

        if ($result['success']) {
            return redirect()->to('/dashboard')->with('success', 'Hoş geldiniz!');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', $result['message']);
    }

    /**
     * Logout user
     */
    public function logout()
    {
        $this->authService->logout();

        return redirect()->to('/login')->with('success', 'Başarıyla çıkış yaptınız.');
    }
}
