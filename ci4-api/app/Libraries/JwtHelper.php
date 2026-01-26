<?php

namespace App\Libraries;

/**
 * JWT Helper Class
 * Handles JWT token creation and verification
 */
class JwtHelper
{
    private string $secret;
    private int $expiry;

    public function __construct()
    {
        $this->secret = getenv('JWT_SECRET') ?: 'default-secret-key-change-in-production';
        $this->expiry = 60 * 60 * 24 * 7; // 7 days
    }

    /**
     * Create a JWT token
     */
    public function create(array $payload): string
    {
        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];

        $payload['exp'] = time() + $this->expiry;
        $payload['iat'] = time();

        $base64Header = $this->base64UrlEncode(json_encode($header));
        $base64Payload = $this->base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", $this->secret, true);
        $base64Signature = $this->base64UrlEncode($signature);

        return "$base64Header.$base64Payload.$base64Signature";
    }

    /**
     * Verify and decode a JWT token
     */
    public function verify(string $token): ?array
    {
        if (empty($token)) {
            return null;
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$base64Header, $base64Payload, $base64Signature] = $parts;

        // Verify signature
        $expectedSignature = hash_hmac('sha256', "$base64Header.$base64Payload", $this->secret, true);
        $expectedBase64Signature = $this->base64UrlEncode($expectedSignature);

        if (!hash_equals($expectedBase64Signature, $base64Signature)) {
            return null;
        }

        // Decode payload
        $payload = json_decode($this->base64UrlDecode($base64Payload), true);

        if (!$payload) {
            return null;
        }

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    /**
     * Extract token from Authorization header
     */
    public function extractToken(string $authHeader): ?string
    {
        if (empty($authHeader)) {
            return null;
        }

        if (strpos($authHeader, 'Bearer ') === 0) {
            return substr($authHeader, 7);
        }

        return $authHeader;
    }

    /**
     * Base64 URL encode
     */
    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     */
    private function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
