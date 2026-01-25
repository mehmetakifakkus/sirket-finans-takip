// User types
export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'staff';
  status: 'active' | 'inactive';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

// Party types
export interface Party {
  id: number;
  type: 'customer' | 'vendor' | 'other';
  name: string;
  tax_no: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Category types
export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  parent_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Project types
export interface Project {
  id: number;
  party_id: number;
  title: string;
  contract_amount: number;
  currency: Currency;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  party_name?: string;
  collected_amount?: number;
  remaining_amount?: number;
  percentage?: number;
}

// Project Milestone types
export interface ProjectMilestone {
  id: number;
  project_id: number;
  title: string;
  expected_date: string | null;
  expected_amount: number;
  currency: Currency;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Transaction types
export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  party_id: number | null;
  category_id: number | null;
  project_id: number | null;
  milestone_id: number | null;
  date: string;
  amount: number;
  currency: Currency;
  vat_rate: number;
  vat_amount: number;
  withholding_rate: number;
  withholding_amount: number;
  net_amount: number;
  description: string | null;
  ref_no: string | null;
  document_path: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  party_name?: string;
  category_name?: string;
  project_title?: string;
  milestone_title?: string;
  created_by_name?: string;
  amount_try?: number;
  document_count?: number;
}

// Transaction Document types
export interface TransactionDocument {
  id: number;
  transaction_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
}

// Debt types
export interface Debt {
  id: number;
  kind: 'debt' | 'receivable';
  party_id: number;
  principal_amount: number;
  currency: Currency;
  vat_rate: number;
  start_date: string | null;
  due_date: string | null;
  status: 'open' | 'closed';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  party_name?: string;
  total_paid?: number;
  remaining_amount?: number;
  installments?: Installment[];
}

// Installment types
export interface Installment {
  id: number;
  debt_id: number;
  due_date: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'paid' | 'partial';
  paid_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  party_name?: string;
  kind?: 'debt' | 'receivable';
}

// Payment types
export interface Payment {
  id: number;
  installment_id: number | null;
  related_type: 'installment' | 'debt' | 'milestone';
  related_id: number;
  transaction_id: number | null;
  payment_date: string;
  date: string;
  amount: number;
  currency: Currency;
  method: 'cash' | 'bank' | 'card' | 'other';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  party_name?: string;
  debt_kind?: string;
}

// Exchange Rate types
export interface ExchangeRate {
  id: number;
  rate_date: string;
  base_currency: Currency;
  quote_currency: Currency;
  rate: number;
  source: 'manual' | 'tcmb' | 'kapali-carsi';
  created_at: string;
}

// Audit Log types
export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity: string;
  entity_id: number | null;
  old_data: string | null;
  new_data: string | null;
  ip_address: string | null;
  created_at: string;
}

// Currency type
export type Currency = 'TRY' | 'USD' | 'EUR' | 'GR';

// Currency symbols
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GR: 'gr',
};

// Currency names
export const CURRENCY_NAMES: Record<Currency, string> = {
  TRY: 'Türk Lirası',
  USD: 'Amerikan Doları',
  EUR: 'Euro',
  GR: 'Gram Altın',
};

// Filter types
export interface TransactionFilters {
  type?: 'income' | 'expense';
  party_id?: number;
  category_id?: number;
  project_id?: number;
  date_from?: string;
  date_to?: string;
  currency?: Currency;
}

export interface DebtFilters {
  kind?: 'debt' | 'receivable';
  party_id?: number;
  status?: 'open' | 'closed';
}

export interface ProjectFilters {
  party_id?: number;
  status?: 'active' | 'completed' | 'cancelled' | 'on_hold';
}

// Dashboard data types
export interface DashboardData {
  monthly_income: number;
  monthly_expense: number;
  monthly_balance: number;
  total_debt: number;
  total_receivable: number;
  net_position: number;
  upcoming_installments: Installment[];
  overdue_installments: Installment[];
  overdue_count: number;
  active_projects: Project[];
  active_projects_count: number;
  recent_transactions: Transaction[];
}

// Report types
export interface TransactionReport {
  transactions: Transaction[];
  totals: {
    income: { TRY: number; USD: number; EUR: number; total_try: number };
    expense: { TRY: number; USD: number; EUR: number; total_try: number };
  };
  balance_try: number;
}

export interface DebtReport {
  debts: Debt[];
  totals: {
    debt: { principal: number; paid: number; remaining: number };
    receivable: { principal: number; paid: number; remaining: number };
  };
  net_position: number;
}

export interface ProjectReport {
  projects: Project[];
  totals: {
    contract_total: number;
    collected_total: number;
    remaining_total: number;
  };
}

// API Response types
export interface ApiResponse<T = void> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

// Form data types
export interface TransactionFormData {
  type: 'income' | 'expense';
  party_id: number | null;
  category_id: number | null;
  project_id: number | null;
  milestone_id: number | null;
  date: string;
  amount: number;
  currency: Currency;
  vat_rate: number;
  withholding_rate: number;
  description: string;
  ref_no: string;
}

export interface DebtFormData {
  kind: 'debt' | 'receivable';
  party_id: number;
  principal_amount: number;
  currency: Currency;
  vat_rate: number;
  start_date: string;
  due_date: string;
  notes: string;
}

export interface ProjectFormData {
  party_id: number;
  title: string;
  contract_amount: number;
  currency: Currency;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  notes: string;
}

export interface PartyFormData {
  type: 'customer' | 'vendor' | 'other';
  name: string;
  tax_no: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export interface CategoryFormData {
  name: string;
  type: 'income' | 'expense';
  parent_id: number | null;
  is_active: boolean;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'staff';
  status: 'active' | 'inactive';
}

export interface ExchangeRateFormData {
  rate_date: string;
  quote_currency: Currency;
  rate: number;
}

// Import types
export interface ImportRow {
  rowNumber: number;
  expenseType: string;
  date: string;
  dateISO: string | null;
  location: string;
  itemType: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number;
  isValid: boolean;
  errors: string[];
  selected: boolean;
  categoryId?: number;
  partyId?: number;
  isNewCategory?: boolean;
  isNewParty?: boolean;
  originalLocation?: string; // Original location before merge
}

export interface ImportPreview {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  skippedRows: number;
  rows: ImportRow[];
  categories: { name: string; exists: boolean }[];
  parties: { name: string; exists: boolean }[];
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  failed: number;
  categoriesCreated: number;
  partiesCreated: number;
  errors: string[];
}
