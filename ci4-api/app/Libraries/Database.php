<?php

namespace App\Libraries;

use PDO;
use PDOException;

/**
 * Simple Database Connection
 * Standalone PDO wrapper for API
 */
class Database
{
    private static ?PDO $instance = null;

    public static function connect(): PDO
    {
        if (self::$instance === null) {
            $host = getenv('database.default.hostname') ?: 'localhost';
            $db = getenv('database.default.database') ?: 'sirket_finans';
            $user = getenv('database.default.username') ?: 'root';
            $pass = getenv('database.default.password') ?: '';
            $port = getenv('database.default.port') ?: '3306';

            $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";

            try {
                self::$instance = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                throw new \Exception('Database connection failed: ' . $e->getMessage());
            }
        }

        return self::$instance;
    }

    public static function query(string $sql, array $params = []): array
    {
        $stmt = self::connect()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function queryOne(string $sql, array $params = []): ?array
    {
        $stmt = self::connect()->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public static function execute(string $sql, array $params = []): int
    {
        $stmt = self::connect()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public static function insert(string $table, array $data): int
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));

        $sql = "INSERT INTO $table ($columns) VALUES ($placeholders)";
        self::execute($sql, array_values($data));

        return (int)self::connect()->lastInsertId();
    }

    public static function update(string $table, array $data, string $where, array $whereParams = []): int
    {
        $set = implode(', ', array_map(fn($k) => "$k = ?", array_keys($data)));
        $sql = "UPDATE $table SET $set WHERE $where";

        return self::execute($sql, array_merge(array_values($data), $whereParams));
    }

    public static function delete(string $table, string $where, array $params = []): int
    {
        $sql = "DELETE FROM $table WHERE $where";
        return self::execute($sql, $params);
    }

    public static function count(string $table, string $where = '1=1', array $params = []): int
    {
        $sql = "SELECT COUNT(*) as cnt FROM $table WHERE $where";
        $result = self::queryOne($sql, $params);
        return (int)($result['cnt'] ?? 0);
    }

    public static function tableExists(string $table): bool
    {
        // Sanitize table name (only allow alphanumeric and underscore)
        $table = preg_replace('/[^a-zA-Z0-9_]/', '', $table);
        $result = self::queryOne("SHOW TABLES LIKE '$table'");
        return $result !== null;
    }

    public static function listTables(): array
    {
        $results = self::query("SHOW TABLES");
        return array_map(fn($r) => array_values($r)[0], $results);
    }

    public static function beginTransaction(): void
    {
        self::connect()->beginTransaction();
    }

    public static function commit(): void
    {
        self::connect()->commit();
    }

    public static function rollback(): void
    {
        self::connect()->rollBack();
    }
}
