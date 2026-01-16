<?php

if (!function_exists('format_date')) {
    /**
     * Format date in Turkish format
     */
    function format_date(?string $date, string $format = 'd.m.Y'): string
    {
        if (empty($date)) {
            return '-';
        }

        try {
            $dt = new DateTime($date);
            return $dt->format($format);
        } catch (Exception $e) {
            return $date;
        }
    }
}

if (!function_exists('format_datetime')) {
    /**
     * Format datetime in Turkish format
     */
    function format_datetime(?string $datetime): string
    {
        if (empty($datetime)) {
            return '-';
        }

        try {
            $dt = new DateTime($datetime);
            return $dt->format('d.m.Y H:i');
        } catch (Exception $e) {
            return $datetime;
        }
    }
}

if (!function_exists('format_datetime_full')) {
    /**
     * Format datetime with seconds
     */
    function format_datetime_full(?string $datetime): string
    {
        if (empty($datetime)) {
            return '-';
        }

        try {
            $dt = new DateTime($datetime);
            return $dt->format('d.m.Y H:i:s');
        } catch (Exception $e) {
            return $datetime;
        }
    }
}

if (!function_exists('time_ago')) {
    /**
     * Get relative time string (e.g., "2 saat önce")
     */
    function time_ago(?string $datetime): string
    {
        if (empty($datetime)) {
            return '-';
        }

        try {
            $now = new DateTime();
            $past = new DateTime($datetime);
            $diff = $now->diff($past);

            if ($diff->y > 0) {
                return $diff->y . ' yıl önce';
            }
            if ($diff->m > 0) {
                return $diff->m . ' ay önce';
            }
            if ($diff->d > 0) {
                return $diff->d . ' gün önce';
            }
            if ($diff->h > 0) {
                return $diff->h . ' saat önce';
            }
            if ($diff->i > 0) {
                return $diff->i . ' dakika önce';
            }

            return 'Az önce';
        } catch (Exception $e) {
            return $datetime;
        }
    }
}

if (!function_exists('days_until')) {
    /**
     * Get days until a date
     */
    function days_until(?string $date): ?int
    {
        if (empty($date)) {
            return null;
        }

        try {
            $now = new DateTime('today');
            $target = new DateTime($date);
            $diff = $now->diff($target);

            return $diff->invert ? -$diff->days : $diff->days;
        } catch (Exception $e) {
            return null;
        }
    }
}

if (!function_exists('is_overdue')) {
    /**
     * Check if a date is in the past
     */
    function is_overdue(?string $date): bool
    {
        if (empty($date)) {
            return false;
        }

        try {
            $target = new DateTime($date);
            $today = new DateTime('today');

            return $target < $today;
        } catch (Exception $e) {
            return false;
        }
    }
}

if (!function_exists('month_name')) {
    /**
     * Get Turkish month name
     */
    function month_name(int $month): string
    {
        $months = [
            1  => 'Ocak',
            2  => 'Şubat',
            3  => 'Mart',
            4  => 'Nisan',
            5  => 'Mayıs',
            6  => 'Haziran',
            7  => 'Temmuz',
            8  => 'Ağustos',
            9  => 'Eylül',
            10 => 'Ekim',
            11 => 'Kasım',
            12 => 'Aralık',
        ];

        return $months[$month] ?? '';
    }
}

if (!function_exists('day_name')) {
    /**
     * Get Turkish day name
     */
    function day_name(int $day): string
    {
        $days = [
            0 => 'Pazar',
            1 => 'Pazartesi',
            2 => 'Salı',
            3 => 'Çarşamba',
            4 => 'Perşembe',
            5 => 'Cuma',
            6 => 'Cumartesi',
        ];

        return $days[$day] ?? '';
    }
}
