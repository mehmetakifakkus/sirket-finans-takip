# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Şirket Finans Takip (Company Finance Tracking) is an Electron desktop application for managing company finances. Built with Electron + React + TypeScript + SQLite, it handles transactions, debts/receivables, projects, and multi-currency operations.

## Development Commands

```bash
# Install dependencies (requires Node.js v20 LTS)
nvm use 20
npm install
npx @electron/rebuild  # Rebuild native modules for Electron

# Development
npm run electron:dev   # Start Vite dev server + Electron with hot reload

# Production build
npm run build          # Build for current platform (outputs to release/)

# Type checking
npx tsc --noEmit
```

## Architecture

### Electron-React IPC Communication

The app uses context isolation with a preload script exposing `window.api`:

```
React Component → window.api.method() → IPC → Main Process → Service → SQLite
```

- **Main Process** (`electron/main.ts`): Registers IPC handlers, initializes database and services
- **Preload** (`electron/preload.ts`): Exposes 100+ typed API methods via `contextBridge.exposeInMainWorld`
- **Services** (`electron/services/`): Business logic layer, each service receives `Database.Database` instance

### Database Layer

SQLite database stored at `{userData}/sirket-finans.db` with WAL mode enabled.

- `electron/database/connection.ts`: Database initialization with pragmas
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

## Key Services

| Service | Purpose |
|---------|---------|
| `AuthService` | Login validation (bcryptjs), user CRUD |
| `TransactionService` | Income/expense with VAT/withholding calculations |
| `DebtService` | Debts/receivables with installment management |
| `ProjectService` | Projects with milestones |
| `ExchangeRateService` | Currency rates + TCMB API integration |
| `CurrencyService` | TRY conversion with date-based rate lookup |
| `ReportService` | Dashboard aggregation, CSV export |

## Multi-Currency Handling

All monetary amounts store original currency (TRY/USD/EUR). TRY equivalents are computed at query time using exchange rates. The `CurrencyService.convertToTRY()` method handles date-based rate lookup with fallback to most recent rate.

## Demo Credentials

- Admin: `admin@sirket.com` / `admin123`
- Staff: `personel@sirket.com` / `staff123`
