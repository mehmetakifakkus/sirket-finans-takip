# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Şirket Finans Takip (Company Finance Tracking) is a cross-platform finance management application. It runs as:
- **Electron desktop app**: Uses SQLite (sql.js) with IPC communication
- **Web application**: Uses PostgreSQL backend with REST API

Built with React + TypeScript, it handles transactions, debts/receivables, projects, and multi-currency operations.

## Development Commands

```bash
# Install dependencies (requires Node.js v20 LTS)
nvm use 20
npm install

# Electron Development
npm run dev              # Start Vite dev server + Electron with hot reload
npm run dev:electron     # Same as above

# Web Development
npm run dev:server       # Start backend API server (port 3001)
npm run dev:web          # Start Vite dev server for web (port 5173)
npm run dev:full         # Start both server and web frontend concurrently

# Production Builds
npm run build            # Build Electron app (outputs to release/)
npm run build:electron   # Same as above
npm run build:web        # Build web frontend (outputs to dist-web/)
npm run build:server     # Build backend server

# Code quality
npm run lint             # Run ESLint
npx tsc --noEmit         # Type check without emitting
```

## Architecture

### Dual Platform Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Electron App   │     │   Web Browser   │
│  (window.       │     │  (window.api    │
│   electronApi)  │     │   = HTTP)       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │                       │
    ┌────▼────┐         ┌────────▼────────┐
    │  IPC    │         │   Backend API   │
    │         │         │   (Express.js)  │
    └────┬────┘         │   Port: 3001    │
         │              └────────┬────────┘
    ┌────▼────┐                  │
    │ SQLite  │         ┌────────▼────────┐
    │ (sql.js)│         │   PostgreSQL    │
    └─────────┘         └─────────────────┘
```

### API Abstraction Layer

The app uses a unified API interface that works in both environments:

- **`src/api/types.ts`**: Common API interface definition
- **`src/api/ipc-client.ts`**: Electron IPC wrapper (uses `window.electronApi`)
- **`src/api/http-client.ts`**: Web HTTP client (REST API calls)
- **`src/api/index.ts`**: Platform detection and client factory

```typescript
// Usage in components - works in both Electron and Web
import { api } from '@/api'
const transactions = await api.getTransactions(filters)
```

### Electron Mode (IPC Communication)

```
React Component → api.method() → IpcClient → window.electronApi → IPC → Main Process → Service → SQLite
```

- **Main Process** (`electron/main.ts`): Registers IPC handlers, initializes database and services
- **Preload** (`electron/preload.ts`): Exposes 100+ typed API methods via `window.electronApi`
- **Services** (`electron/services/`): Business logic layer with SQLite database

### Web Mode (HTTP Communication)

```
React Component → api.method() → HttpClient → fetch() → Backend API → Service → PostgreSQL
```

- **Backend Server** (`server/`): Express.js REST API
- **Routes** (`server/src/routes/`): REST endpoint handlers
- **Database** (`server/src/database/`): PostgreSQL connection and migrations

### Backend Server Structure

```
server/
├── src/
│   ├── index.ts           # Server entry point
│   ├── app.ts             # Express configuration
│   ├── config.ts          # Environment variables
│   ├── middleware/
│   │   ├── auth.ts        # JWT authentication
│   │   └── error.ts       # Error handling
│   ├── routes/            # REST API endpoints
│   │   ├── auth.ts
│   │   ├── transactions.ts
│   │   ├── debts.ts
│   │   ├── projects.ts
│   │   └── ...
│   └── database/
│       ├── connection.ts  # PostgreSQL pool
│       └── migrations.ts  # Schema creation
├── uploads/               # File storage
├── package.json
└── tsconfig.json
```

### Adding New API Methods

1. **Electron mode**: Add to `electron/services/`, register IPC in `electron/main.ts`, expose in `electron/preload.ts`
2. **Web mode**: Add route in `server/src/routes/`, implement service logic
3. **Frontend**: Add to `src/api/types.ts` interface, implement in both `ipc-client.ts` and `http-client.ts`

### Database Layers

**Electron (SQLite)**:
- `electron/database/connection.ts`: sql.js initialization
- `electron/database/migrations.ts`: Schema creation
- Database file: `{userData}/sirket-finans.db`

**Web (PostgreSQL)**:
- `server/src/database/connection.ts`: pg pool management
- `server/src/database/migrations.ts`: PostgreSQL schema
- Connection: Configured via environment variables

### State Management

Zustand stores in `src/store/`:
- `authStore.ts`: User auth state, JWT token management, persisted to localStorage
- `appStore.ts`: UI state (sidebar, alerts with auto-dismiss)

### Routing & Access Control

React Router with three route types in `src/App.tsx`:
- **PublicRoute**: Login page (redirects if authenticated)
- **ProtectedRoute**: All authenticated pages wrapped in MainLayout
- **AdminRoute**: Users, Categories, Exchange Rates (admin role required)

### Internationalization

i18next with three locales in `src/i18n/locales/`:
- `tr.json` (Turkish - default/fallback)
- `en.json` (English)
- `de.json` (German)

Use `useTranslation()` hook: `const { t } = useTranslation(); t('key.path')`

## Key Services

| Service | Purpose |
|---------|---------|
| `AuthService` | Login validation (bcryptjs), JWT tokens (web), user CRUD |
| `TransactionService` | Income/expense with VAT/withholding calculations |
| `DebtService` | Debts/receivables with installment management |
| `ProjectService` | Projects with milestones and grants |
| `PartyService` | Customer/vendor management |
| `ExchangeRateService` | Currency rates + TCMB API integration |
| `CurrencyService` | TRY conversion with date-based rate lookup |
| `ReportService` | Dashboard aggregation, CSV/Excel export |
| `DocumentService` | File uploads and document management |

## Multi-Currency Handling

All monetary amounts store original currency (TRY/USD/EUR). TRY equivalents are computed at query time using exchange rates. The `CurrencyService.convertToTRY()` method handles date-based rate lookup with fallback to most recent rate.

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` → `src/*`
- `@electron/*` → `electron/*`

## Environment Configuration

**Frontend** (`.env`):
```
VITE_API_URL=http://localhost:3001
```

**Backend** (`server/.env`):
```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sirket_finans
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

## Demo Credentials

- Admin: `admin@sirket.com` / `admin123`
- Staff: `personel@sirket.com` / `staff123`

## Build Outputs

- `dist/` - Electron frontend build
- `dist-electron/` - Electron main/preload scripts
- `dist-web/` - Web frontend build
- `release/` - Packaged Electron app
- `server/dist/` - Compiled backend server
