# Şirket Finans Takip - PHP API

REST API backend for the Company Finance Tracking application, built with PHP and MySQL.

## Requirements

- PHP 7.4+ (8.0+ recommended)
- MySQL 5.7+ / MariaDB 10.3+
- Apache with mod_rewrite enabled

## Installation

### 1. Database Setup

Create a MySQL database:

```sql
CREATE DATABASE sirket_finans CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Import the schema:

```bash
mysql -u root -p sirket_finans < database/schema.sql
```

### 2. Configuration

Copy the environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DB_HOST=localhost
DB_NAME=sirket_finans
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:5173
```

### 3. Apache Configuration

The `.htaccess` file handles URL rewriting. Make sure:

1. Apache mod_rewrite is enabled:
   ```bash
   a2enmod rewrite
   ```

2. AllowOverride is set in your Apache config:
   ```apache
   <Directory /var/www/html/api>
       AllowOverride All
   </Directory>
   ```

### 4. File Permissions

```bash
chmod 755 uploads/
chmod 755 backups/
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Get current user |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/transactions | List transactions |
| POST | /api/transactions | Create transaction |
| GET | /api/transactions/:id | Get transaction |
| PUT | /api/transactions/:id | Update transaction |
| DELETE | /api/transactions/:id | Delete transaction |
| GET | /api/transactions/export/csv | Export to CSV |

### Debts & Receivables

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/debts | List debts |
| POST | /api/debts | Create debt |
| GET | /api/debts/:id | Get debt |
| PUT | /api/debts/:id | Update debt |
| DELETE | /api/debts/:id | Delete debt |

### Installments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/installments | List installments |
| POST | /api/installments/:id/pay | Record payment |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |

### Parties (Customers/Vendors)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/parties | List parties |
| POST | /api/parties | Create party |
| GET | /api/parties/:id | Get party |
| PUT | /api/parties/:id | Update party |
| DELETE | /api/parties/:id | Delete party |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | List categories |
| POST | /api/categories | Create category |
| PUT | /api/categories/:id | Update category |
| DELETE | /api/categories/:id | Delete category |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/dashboard | Dashboard data |
| GET | /api/reports/summary | Summary report |
| GET | /api/reports/transactions | Transaction report |
| GET | /api/reports/debts | Debt report |
| GET | /api/reports/projects | Project report |

### Exchange Rates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/exchange-rates | List rates |
| GET | /api/exchange-rates/latest | Latest rates |
| POST | /api/exchange-rates/fetch-tcmb | Fetch from TCMB |

### Setup (First-time)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/setup/check | Check setup status |
| POST | /api/setup/initialize | Initialize database |
| POST | /api/setup/create-admin | Create admin user |
| POST | /api/setup/seed-categories | Seed categories |

### Database (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/database/stats | Database statistics |
| GET | /api/database/export | Export database |
| POST | /api/database/backup | Create backup |
| POST | /api/database/restore | Restore backup |

## Authentication

All endpoints except `/api/auth/login` and `/api/setup/*` require authentication.

Send the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

Success:
```json
{
    "success": true,
    "data": {...}
}
```

Error:
```json
{
    "success": false,
    "message": "Error description"
}
```

## First-time Setup

1. Access `/api/setup/check` to verify database connection
2. If not initialized, access `/api/setup/initialize` to create tables
3. Create admin user via `/api/setup/create-admin`:
   ```json
   {
       "name": "Admin",
       "email": "admin@example.com",
       "password": "secure-password"
   }
   ```
4. Optionally seed categories via `/api/setup/seed-categories`

## Development

For local development, you can use PHP's built-in server:

```bash
cd api
php -S localhost:8000
```

Note: This doesn't support .htaccess, so use Apache for proper URL rewriting.
