<?php

namespace App\Controllers;

use App\Libraries\Database;

class SettingsController extends BaseController
{
    /**
     * Get user settings
     * GET /api/settings
     */
    public function index()
    {
        $userId = $this->getUserId();

        $user = Database::queryOne(
            "SELECT settings FROM users WHERE id = ?",
            [$userId]
        );

        if (!$user) {
            return $this->notFound('Kullanıcı bulunamadı');
        }

        $settings = $this->parseSettings($user['settings']);

        return $this->success('Ayarlar', [
            'settings' => $settings
        ]);
    }

    /**
     * Update user settings
     * PUT /api/settings
     */
    public function update()
    {
        $userId = $this->getUserId();
        $data = $this->getJsonInput();

        // Get current settings
        $user = Database::queryOne(
            "SELECT settings FROM users WHERE id = ?",
            [$userId]
        );

        if (!$user) {
            return $this->notFound('Kullanıcı bulunamadı');
        }

        $currentSettings = $this->parseSettings($user['settings']);

        // Merge with new settings
        $newSettings = array_merge($currentSettings, $data);

        // Validate vat_calculation_mode if provided
        if (isset($newSettings['vat_calculation_mode'])) {
            if (!in_array($newSettings['vat_calculation_mode'], ['included', 'excluded'])) {
                return $this->validationError(['vat_calculation_mode' => 'Geçersiz KDV hesaplama modu']);
            }
        }

        // Save settings
        $settingsJson = json_encode($newSettings, JSON_UNESCAPED_UNICODE);

        Database::update('users', ['settings' => $settingsJson], 'id = ?', [$userId]);

        return $this->success('Ayarlar güncellendi', [
            'settings' => $newSettings
        ]);
    }

    /**
     * Get specific setting
     * GET /api/settings/{key}
     */
    public function show(string $key)
    {
        $userId = $this->getUserId();

        $user = Database::queryOne(
            "SELECT settings FROM users WHERE id = ?",
            [$userId]
        );

        if (!$user) {
            return $this->notFound('Kullanıcı bulunamadı');
        }

        $settings = $this->parseSettings($user['settings']);

        if (!isset($settings[$key])) {
            return $this->success('Ayar', [
                'key' => $key,
                'value' => $this->getDefaultValue($key)
            ]);
        }

        return $this->success('Ayar', [
            'key' => $key,
            'value' => $settings[$key]
        ]);
    }

    /**
     * Parse settings JSON
     */
    private function parseSettings(?string $settingsJson): array
    {
        if (empty($settingsJson)) {
            return $this->getDefaultSettings();
        }

        $settings = json_decode($settingsJson, true);

        if (!is_array($settings)) {
            return $this->getDefaultSettings();
        }

        // Merge with defaults to ensure all keys exist
        return array_merge($this->getDefaultSettings(), $settings);
    }

    /**
     * Get default settings
     */
    private function getDefaultSettings(): array
    {
        return [
            'vat_calculation_mode' => 'included',
            'language' => 'tr'
        ];
    }

    /**
     * Get default value for a specific key
     */
    private function getDefaultValue(string $key)
    {
        $defaults = $this->getDefaultSettings();
        return $defaults[$key] ?? null;
    }
}
