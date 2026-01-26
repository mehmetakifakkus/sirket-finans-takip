<?php

namespace App\Controllers;

/**
 * Base Controller
 * Provides common functionality for all API controllers
 * Works in both CodeIgniter 4 mode and standalone mode
 */
abstract class BaseController
{
    /**
     * Request object
     */
    public $request;

    /**
     * Response object
     */
    protected $response;

    /**
     * Authenticated user data
     */
    public ?array $user = null;

    /**
     * Constructor - initialize for standalone mode
     */
    public function __construct()
    {
        // Initialize response for standalone mode
        $this->response = new class {
            private $statusCode = 200;
            private $headers = [];
            private $body = '';
            private $contentType = 'application/json';

            public function setStatusCode(int $code) {
                $this->statusCode = $code;
                return $this;
            }

            public function getStatusCode(): int {
                return $this->statusCode;
            }

            public function setHeader(string $name, string $value) {
                $this->headers[$name] = $value;
                return $this;
            }

            public function getHeaders(): array {
                return $this->headers;
            }

            public function setContentType(string $type) {
                $this->contentType = $type;
                $this->headers['Content-Type'] = $type;
                return $this;
            }

            public function setJSON($data) {
                $this->body = json_encode($data, JSON_UNESCAPED_UNICODE);
                $this->contentType = 'application/json';
                $this->headers['Content-Type'] = 'application/json; charset=utf-8';
                return $this;
            }

            public function setBody(string $body) {
                $this->body = $body;
                return $this;
            }

            public function getBody(): string {
                return $this->body;
            }

            public function send() {
                http_response_code($this->statusCode);
                foreach ($this->headers as $name => $value) {
                    header("$name: $value");
                }
                echo $this->body;
            }
        };
    }

    /**
     * Initialize controller (CodeIgniter mode)
     */
    public function initController($request, $response, $logger)
    {
        $this->request = $request;
        $this->response = $response;
        $this->user = $request->user ?? null;
    }

    /**
     * Get authenticated user ID
     */
    protected function getUserId(): ?int
    {
        return $this->user['userId'] ?? null;
    }

    /**
     * Get authenticated user role
     */
    protected function getUserRole(): ?string
    {
        return $this->user['role'] ?? null;
    }

    /**
     * Check if user is admin
     */
    protected function isAdmin(): bool
    {
        return $this->getUserRole() === 'admin';
    }

    /**
     * Get JSON request body
     */
    protected function getJsonInput(): array
    {
        if ($this->request && is_object($this->request) && method_exists($this->request, 'getJSON')) {
            $json = $this->request->getJSON(true);
            return is_array($json) ? $json : [];
        }

        if ($this->request && is_object($this->request) && isset($this->request->getJSON)) {
            $fn = $this->request->getJSON;
            $json = $fn(true);
            return is_array($json) ? $json : [];
        }

        // Standalone mode
        $body = file_get_contents('php://input');
        $json = json_decode($body, true);
        return is_array($json) ? $json : [];
    }

    /**
     * Return JSON response
     */
    protected function jsonResponse($data, int $status = 200)
    {
        return $this->response
            ->setStatusCode($status)
            ->setContentType('application/json')
            ->setJSON($data);
    }

    /**
     * Return success response
     */
    protected function success(string $message, $data = null, int $status = 200)
    {
        $response = ['success' => true, 'message' => $message];

        if ($data !== null) {
            if (is_array($data)) {
                $response = array_merge($response, $data);
            } else {
                $response['data'] = $data;
            }
        }

        return $this->jsonResponse($response, $status);
    }

    /**
     * Return error response
     */
    protected function error(string $message, int $status = 400, $errors = null)
    {
        $response = ['success' => false, 'message' => $message];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        return $this->jsonResponse($response, $status);
    }

    /**
     * Return not found response
     */
    protected function notFound(string $message = 'Kayıt bulunamadı')
    {
        return $this->error($message, 404);
    }

    /**
     * Return validation error response
     */
    protected function validationError($errors)
    {
        return $this->error('Doğrulama hatası', 422, $errors);
    }

    /**
     * Return unauthorized response
     */
    protected function unauthorized(string $message = 'Yetkisiz erişim')
    {
        return $this->error($message, 401);
    }

    /**
     * Return forbidden response
     */
    protected function forbidden(string $message = 'Erişim reddedildi')
    {
        return $this->error($message, 403);
    }

    /**
     * Return created response
     */
    protected function created(string $message, $data = null)
    {
        return $this->success($message, $data, 201);
    }

    /**
     * Get query parameter
     */
    protected function getQueryParam(string $key, $default = null)
    {
        if ($this->request && is_object($this->request) && method_exists($this->request, 'getGet')) {
            return $this->request->getGet($key) ?? $default;
        }

        if ($this->request && is_object($this->request) && isset($this->request->getGet)) {
            $fn = $this->request->getGet;
            return $fn($key) ?? $default;
        }

        return $_GET[$key] ?? $default;
    }

    /**
     * Get multiple query parameters
     */
    protected function getQueryParams(array $keys): array
    {
        $params = [];
        foreach ($keys as $key) {
            $value = $this->getQueryParam($key);
            if ($value !== null && $value !== '') {
                $params[$key] = $value;
            }
        }
        return $params;
    }

    /**
     * Validate required fields
     */
    protected function validateRequired(array $data, array $required): array
    {
        $errors = [];
        foreach ($required as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                $errors[$field] = "$field alanı zorunludur";
            }
        }
        return $errors;
    }

    /**
     * Get upload path
     */
    protected function getUploadPath(): string
    {
        $path = defined('WRITEPATH') ? WRITEPATH . 'uploads/' : dirname(__DIR__, 2) . '/writable/uploads/';
        if (!is_dir($path)) {
            mkdir($path, 0755, true);
        }
        return $path;
    }

    /**
     * Get backup path
     */
    protected function getBackupPath(): string
    {
        $path = defined('WRITEPATH') ? WRITEPATH . 'backups/' : dirname(__DIR__, 2) . '/writable/backups/';
        if (!is_dir($path)) {
            mkdir($path, 0755, true);
        }
        return $path;
    }
}
