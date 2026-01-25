# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Şirket Finans Takip (Company Finance Tracking) is an Electron desktop application for managing company finances. Built with Electron + React + TypeScript + SQLite (sql.js), it handles transactions, debts/receivables, projects, and multi-currency operations.

## Development Commands

```bash
# Install dependencies (requires Node.js v20 LTS)
nvm use 20
npm install

# Development
npm run electron:dev   # Start Vite dev server + Electron with hot reload

# Production build
npm run build          # Build for current platform (outputs to release/)

# Code quality
npm run lint           # Run ESLint
npx tsc --noEmit       # Type check without emitting
```

## Architecture

### Electron-React IPC Communication

The app uses context isolation with a preload script exposing `window.api`:

```
React Component → window.api.method() → IPC → Main Process → Service → SQLite
```

- **Main Process** (`electron/main.ts`): Registers IPC handlers, initializes database and services
- **Preload** (`electron/preload.ts`): Exposes 100+ typed API methods via `contextBridge.exposeInMainWorld`
- **Services** (`electron/services/`): Business logic layer, each service receives database instance

### Adding New IPC Methods

1. Add service method in `electron/services/`
2. Register IPC handler in `electron/main.ts`
3. Expose in preload script `electron/preload.ts`
4. Add type to `IElectronAPI` interface in preload
5. Types auto-available via `window.api` (see `src/global.d.ts`)

### Database Layer

SQLite (sql.js) database stored at `{userData}/sirket-finans.db`.

- `electron/database/connection.ts`: Database initialization
- `electron/database/migrations.ts`: Schema creation (12 tables)
- `electron/database/seed.ts`: Demo data population

### State Management

Zustand stores in `src/store/`:
- `authStore.ts`: User auth state, persisted to localStorage
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
| `AuthService` | Login validation (bcryptjs), user CRUD |
| `TransactionService` | Income/expense with VAT/withholding calculations |
| `DebtService` | Debts/receivables with installment management |
| `ProjectService` | Projects with milestones |
| `PartyService` | Customer/vendor management |
| `ExchangeRateService` | Currency rates + TCMB API integration |
| `CurrencyService` | TRY conversion with date-based rate lookup |
| `ReportService` | Dashboard aggregation, CSV/Excel export |

## Multi-Currency Handling

All monetary amounts store original currency (TRY/USD/EUR). TRY equivalents are computed at query time using exchange rates. The `CurrencyService.convertToTRY()` method handles date-based rate lookup with fallback to most recent rate.

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` → `src/*`
- `@electron/*` → `electron/*`

## Demo Credentials

- Admin: `admin@sirket.com` / `admin123`
- Staff: `personel@sirket.com` / `staff123`
