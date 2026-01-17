# Şirket Finans Takip (Company Finance Tracker)

A comprehensive desktop application for managing company finances, built with Electron, React, TypeScript, and SQLite.

## Features

### Core Modules

- **Dashboard**: Real-time financial overview with monthly income/expense summaries, upcoming payments, overdue installments, and active projects
- **Transactions**: Track all income and expense transactions with VAT and withholding tax calculations
- **Debts & Receivables**: Manage payables and receivables with automatic installment generation
- **Projects**: Track contracts and projects with milestone-based payment schedules
- **Parties**: Maintain customer, vendor, and other business partner records
- **Payments**: Complete payment history with multiple payment method support
- **Reports**: Generate summary, transaction, debt, and project reports with CSV export
- **Exchange Rates**: Multi-currency support (TRY, USD, EUR) with TCMB integration

### Additional Features

- **Multi-Currency Support**: All transactions support TRY, USD, and EUR with automatic TRY conversion
- **TCMB Integration**: Fetch live exchange rates from Turkish Central Bank
- **Role-Based Access**: Admin and Staff roles with different permission levels
- **CSV Export**: Export transactions, debts, and reports to CSV format
- **Offline-First**: All data stored locally in SQLite database
- **Cross-Platform**: Runs on macOS, Windows, and Linux

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, TailwindCSS |
| **State Management** | Zustand |
| **Routing** | React Router 6 |
| **Desktop Framework** | Electron 28 |
| **Database** | SQLite 3 (better-sqlite3) |
| **Build Tool** | Vite 5 |
| **Package Builder** | Electron Builder |

## Prerequisites

- **Node.js**: v20 LTS (required for native module compatibility)
- **npm**: v10 or later
- **nvm**: Recommended for Node.js version management

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/sirket-finans-takip.git
cd sirket-finans-takip
```

### 2. Switch to Electron Desktop Branch

```bash
git checkout electron-desktop
```

### 3. Install Node.js v20 (if not already installed)

```bash
nvm install 20
nvm use 20
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Rebuild Native Modules for Electron

```bash
npx @electron/rebuild
```

### 6. Start Development Server

```bash
npm run electron:dev
```

The application will open automatically with hot-reload enabled.

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sirket.com | admin123 |
| Staff | personel@sirket.com | staff123 |

## Project Structure

```
sirket-finans-takip/
├── electron/                     # Electron main process
│   ├── main.ts                   # App entry, window creation, IPC handlers
│   ├── preload.ts                # Context bridge, API exposure
│   ├── database/
│   │   ├── connection.ts         # SQLite connection with WAL mode
│   │   ├── migrations.ts         # Database schema (12 tables)
│   │   └── seed.ts               # Demo data seeder
│   └── services/                 # Business logic layer
│       ├── AuthService.ts        # Authentication & user management
│       ├── TransactionService.ts # Income/expense operations
│       ├── DebtService.ts        # Debt & installment management
│       ├── ProjectService.ts     # Project & milestone tracking
│       ├── PartyService.ts       # Customer/vendor management
│       ├── CategoryService.ts    # Transaction categories
│       ├── PaymentService.ts     # Payment records
│       ├── ExchangeRateService.ts# Currency rates & TCMB API
│       ├── CurrencyService.ts    # Currency conversion utilities
│       ├── ReportService.ts      # Dashboard & report generation
│       └── FileService.ts        # Document management
├── src/                          # React frontend
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Router configuration
│   ├── global.d.ts               # Window.api type definitions
│   ├── components/
│   │   └── layout/
│   │       ├── MainLayout.tsx    # Protected layout wrapper
│   │       ├── Sidebar.tsx       # Navigation sidebar
│   │       └── Topbar.tsx        # Header with user menu
│   ├── pages/                    # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── Debts.tsx
│   │   ├── DebtDetail.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── Parties.tsx
│   │   ├── Payments.tsx
│   │   ├── Categories.tsx
│   │   ├── ExchangeRates.tsx
│   │   ├── Reports.tsx
│   │   └── Users.tsx
│   ├── store/                    # Zustand stores
│   │   ├── authStore.ts          # Authentication state
│   │   └── appStore.ts           # UI state (alerts, sidebar)
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── utils/
│       ├── currency.ts           # Currency formatting
│       ├── date.ts               # Date utilities
│       └── validation.ts         # Zod validation schemas
├── package.json
├── vite.config.ts                # Vite + Electron plugin config
├── tailwind.config.js
├── tsconfig.json
└── electron-builder.json         # Build configuration
```

## Database Schema

The application uses SQLite with the following tables:

### Users & Authentication
- **users**: User accounts with roles (admin/staff) and status

### Business Entities
- **parties**: Customers, vendors, and other business partners
- **categories**: Income and expense categories (hierarchical)
- **projects**: Contracts and projects with status tracking
- **project_milestones**: Payment milestones for projects

### Financial Records
- **transactions**: All income and expense records with tax calculations
- **debts**: Payables and receivables
- **installments**: Payment schedules for debts
- **payments**: Payment records linked to installments

### System Data
- **exchange_rates**: Currency exchange rates (manual or TCMB)
- **audit_logs**: Activity tracking for compliance

## Architecture

### IPC Communication

The application uses Electron's context isolation for secure communication:

```
┌─────────────────┐     IPC      ┌─────────────────┐     SQL      ┌──────────┐
│  React Frontend │ ◄──────────► │  Main Process   │ ◄──────────► │  SQLite  │
│  (Renderer)     │   window.api │  (Services)     │              │          │
└─────────────────┘              └─────────────────┘              └──────────┘
```

1. React components call `window.api.methodName()`
2. Preload script forwards call via `ipcRenderer.invoke()`
3. Main process handler executes service method
4. Service queries SQLite and returns result
5. Result flows back through IPC to React

### State Management

- **AuthStore**: User authentication state with localStorage persistence
- **AppStore**: UI state including sidebar toggle and alert notifications

### Multi-Currency Handling

All monetary amounts are stored with their original currency. TRY equivalents are calculated at query time using:

1. Exchange rate for the transaction date
2. Fallback to most recent available rate
3. 1:1 ratio if no rate found (for TRY)

## Available Scripts

```bash
# Development
npm run dev              # Start Vite dev server only
npm run electron:dev     # Start full Electron app with hot reload

# Production
npm run build            # Build for current platform
npm run electron:build   # Alias for npm run build

# Utilities
npm run preview          # Preview production build
npm run lint             # Run ESLint
npx tsc --noEmit         # Type check without emitting
```

## Building for Production

### macOS (DMG)

```bash
npm run build
# Output: release/Sirket Finans Takip-{version}.dmg
```

### Windows (NSIS Installer)

```bash
npm run build
# Output: release/Sirket Finans Takip Setup {version}.exe
```

### Linux (AppImage)

```bash
npm run build
# Output: release/Sirket Finans Takip-{version}.AppImage
```

## Configuration

### Database Location

The SQLite database is stored at:
- **macOS**: `~/Library/Application Support/sirket-finans-takip/sirket-finans.db`
- **Windows**: `%APPDATA%/sirket-finans-takip/sirket-finans.db`
- **Linux**: `~/.config/sirket-finans-takip/sirket-finans.db`

### Environment Variables

No environment variables required. All configuration is embedded in the application.

## API Reference

The application exposes 100+ IPC methods through `window.api`. Key categories:

### Authentication
- `login(email, password)`: Authenticate user
- `logout()`: End session
- `getCurrentUser()`: Get current user info

### Transactions
- `getTransactions(filters?)`: List transactions
- `createTransaction(data)`: Create new transaction
- `updateTransaction(id, data)`: Update transaction
- `deleteTransaction(id)`: Delete transaction
- `exportTransactions(filters?)`: Export to CSV

### Debts & Installments
- `getDebts(filters?)`: List debts/receivables
- `getDebt(id)`: Get debt with installments
- `createDebt(data)`: Create new debt
- `createInstallments(debtId, count)`: Generate installments
- `addInstallmentPayment(installmentId, data)`: Record payment

### Projects
- `getProjects(filters?)`: List projects
- `getProject(id)`: Get project with milestones
- `createProject(data)`: Create new project
- `createMilestone(data)`: Add milestone to project

### Reports
- `getDashboardData()`: Get dashboard statistics
- `getReportSummary(filters?)`: Get summary report
- `getTransactionReport(filters?)`: Get transaction report
- `exportReport(type, filters?)`: Export report to CSV

## Troubleshooting

### Native Module Errors

If you see errors about `better-sqlite3` module version mismatch:

```bash
npx @electron/rebuild
```

### Node.js Version Issues

Ensure you're using Node.js v20:

```bash
nvm use 20
node -v  # Should show v20.x.x
```

### Database Reset

To reset the database and start fresh:

1. Close the application
2. Delete the database file (see Database Location above)
3. Restart the application (migrations and seed will run automatically)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Electron](https://www.electronjs.org/) - Desktop application framework
- [React](https://reactjs.org/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite bindings
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [TCMB](https://www.tcmb.gov.tr/) - Exchange rate data
