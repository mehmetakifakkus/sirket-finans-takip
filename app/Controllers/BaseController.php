<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\CLIRequest;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;
use App\Services\AuthService;

abstract class BaseController extends Controller
{
    /**
     * Instance of the main Request object.
     *
     * @var CLIRequest|IncomingRequest
     */
    protected $request;

    /**
     * An array of helpers to be loaded automatically upon class instantiation.
     *
     * @var list<string>
     */
    protected $helpers = ['url', 'form', 'currency', 'date'];

    /**
     * Auth service
     */
    protected AuthService $authService;

    /**
     * Current user data
     */
    protected ?array $currentUser = null;

    /**
     * View data array
     */
    protected array $viewData = [];

    /**
     * Be sure to declare properties for any property fetch you initialized.
     * The creation of dynamic property is deprecated in PHP 8.2.
     */
    // protected $session;

    /**
     * @return void
     */
    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger)
    {
        // Do Not Edit This Line
        parent::initController($request, $response, $logger);

        // Preload any models, libraries, etc, here.
        $this->authService = new AuthService();

        // Set common view data
        $this->viewData = [
            'currentUser' => [
                'id'    => session()->get('user_id'),
                'name'  => session()->get('user_name'),
                'email' => session()->get('user_email'),
                'role'  => session()->get('role'),
            ],
            'isAdmin' => $this->authService->isAdmin(),
            'canEdit' => $this->authService->canEdit(),
            'canDelete' => $this->authService->canDelete(),
        ];
    }

    /**
     * Render a view with layout
     */
    protected function render(string $view, array $data = []): string
    {
        $data = array_merge($this->viewData, $data);
        $data['content'] = view($view, $data);

        return view('layouts/main', $data);
    }

    /**
     * Return JSON response
     */
    protected function jsonResponse(array $data, int $statusCode = 200): ResponseInterface
    {
        return $this->response
            ->setStatusCode($statusCode)
            ->setJSON($data);
    }

    /**
     * Redirect with success message
     */
    protected function redirectWithSuccess(string $url, string $message): ResponseInterface
    {
        return redirect()->to($url)->with('success', $message);
    }

    /**
     * Redirect with error message
     */
    protected function redirectWithError(string $url, string $message): ResponseInterface
    {
        return redirect()->to($url)->with('error', $message);
    }

    /**
     * Check if user can perform edit/update actions
     */
    protected function checkEditPermission(): bool
    {
        if (!$this->authService->canEdit()) {
            session()->setFlashdata('error', 'Bu işlem için yetkiniz bulunmamaktadır.');
            return false;
        }
        return true;
    }

    /**
     * Check if user can perform delete actions
     */
    protected function checkDeletePermission(): bool
    {
        if (!$this->authService->canDelete()) {
            session()->setFlashdata('error', 'Silme işlemi için yetkiniz bulunmamaktadır.');
            return false;
        }
        return true;
    }

    /**
     * Get POST data with CSRF validation
     */
    protected function getPostData(): array
    {
        return $this->request->getPost();
    }

    /**
     * Validate request data
     */
    protected function validateRequest(array $rules, array $messages = []): bool
    {
        return $this->validate($rules, $messages);
    }

    /**
     * Get validation errors
     */
    protected function getValidationErrors(): array
    {
        return $this->validator->getErrors();
    }
}
