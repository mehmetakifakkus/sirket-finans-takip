<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use App\Libraries\JwtHelper;

/**
 * Admin Filter
 * Validates JWT token and checks for admin role
 */
class AdminFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $jwt = new JwtHelper();
        $authHeader = $request->getHeaderLine('Authorization');
        $token = $jwt->extractToken($authHeader);

        if (!$token) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON([
                    'success' => false,
                    'message' => 'No token provided'
                ]);
        }

        $payload = $jwt->verify($token);

        if (!$payload) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON([
                    'success' => false,
                    'message' => 'Invalid or expired token'
                ]);
        }

        // Check admin role
        if (!isset($payload['role']) || $payload['role'] !== 'admin') {
            return service('response')
                ->setStatusCode(403)
                ->setJSON([
                    'success' => false,
                    'message' => 'Admin access required'
                ]);
        }

        // Store user data in request for controllers to access
        $request->user = $payload;
        service('request')->user = $payload;

        return $request;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}
