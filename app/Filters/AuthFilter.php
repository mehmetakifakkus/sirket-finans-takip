<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AuthFilter implements FilterInterface
{
    /**
     * Check if user is logged in and has required role
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        $session = session();

        // Check if user is logged in
        if (!$session->get('isLoggedIn')) {
            return redirect()->to('/login')->with('error', 'Lütfen giriş yapın.');
        }

        // Check role if specified
        if (!empty($arguments)) {
            $requiredRole = $arguments[0];
            $userRole = $session->get('role');

            if ($requiredRole === 'admin' && $userRole !== 'admin') {
                return redirect()->to('/dashboard')->with('error', 'Bu işlem için yetkiniz bulunmamaktadır.');
            }
        }

        return null;
    }

    /**
     * After filter - not used
     */
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Nothing to do here
    }
}
