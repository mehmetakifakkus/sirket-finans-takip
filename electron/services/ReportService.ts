import { DatabaseWrapper, formatDate } from '../database/connection'
import { CurrencyService } from './CurrencyService'
import { TransactionService } from './TransactionService'
import { DebtService } from './DebtService'
import { ProjectService } from './ProjectService'

export class ReportService {
  private db: DatabaseWrapper
  private currencyService: CurrencyService
  private transactionService: TransactionService
  private debtService: DebtService
  private projectService: ProjectService

  constructor(db: DatabaseWrapper) {
    this.db = db
    this.currencyService = new CurrencyService(db)
    this.transactionService = new TransactionService(db)
    this.debtService = new DebtService(db)
    this.projectService = new ProjectService(db)
  }

  getDashboardData(): object {
    const today = formatDate(new Date())
    const firstDayOfMonth = today.substring(0, 8) + '01'
    const lastDayOfMonth = this.getLastDayOfMonth(today)

    // This month's transactions
    const transactions = this.db.prepare(`
      SELECT * FROM transactions WHERE date >= ? AND date <= ?
    `).all(firstDayOfMonth, lastDayOfMonth) as { type: string; net_amount: number; currency: string; date: string }[]

    let monthlyIncome = 0
    let monthlyExpense = 0

    for (const t of transactions) {
      const conversion = this.currencyService.convertToTRY(t.net_amount, t.currency, t.date)
      if (t.type === 'income') {
        monthlyIncome += conversion.amount_try
      } else {
        monthlyExpense += conversion.amount_try
      }
    }

    // Open debts and receivables
    const openDebts = this.db.prepare(`
      SELECT * FROM debts WHERE status = 'open' AND kind = 'debt'
    `).all() as { id: number; principal_amount: number; currency: string }[]

    const openReceivables = this.db.prepare(`
      SELECT * FROM debts WHERE status = 'open' AND kind = 'receivable'
    `).all() as { id: number; principal_amount: number; currency: string }[]

    let totalDebt = 0
    let totalReceivable = 0

    for (const debt of openDebts) {
      const paidAmount = this.debtService.calculatePaidAmount(debt.id)
      const remaining = debt.principal_amount - paidAmount
      const conversion = this.currencyService.convertToTRY(remaining, debt.currency, today)
      totalDebt += conversion.amount_try
    }

    for (const receivable of openReceivables) {
      const paidAmount = this.debtService.calculatePaidAmount(receivable.id)
      const remaining = receivable.principal_amount - paidAmount
      const conversion = this.currencyService.convertToTRY(remaining, receivable.currency, today)
      totalReceivable += conversion.amount_try
    }

    // Upcoming installments (next 30 days)
    const upcomingInstallments = this.debtService.getUpcomingInstallments(30)

    // Overdue installments
    const overdueInstallments = this.debtService.getOverdueInstallments()

    // Active projects
    const activeProjects = this.projectService.getActiveProjects()

    // Recent transactions
    const recentTransactions = this.transactionService.getRecent(5)

    return {
      monthly_income: Math.round(monthlyIncome * 100) / 100,
      monthly_expense: Math.round(monthlyExpense * 100) / 100,
      monthly_balance: Math.round((monthlyIncome - monthlyExpense) * 100) / 100,
      total_debt: Math.round(totalDebt * 100) / 100,
      total_receivable: Math.round(totalReceivable * 100) / 100,
      net_position: Math.round((totalReceivable - totalDebt) * 100) / 100,
      upcoming_installments: upcomingInstallments,
      overdue_installments: overdueInstallments,
      overdue_count: overdueInstallments.length,
      active_projects: activeProjects,
      active_projects_count: activeProjects.length,
      recent_transactions: recentTransactions
    }
  }

  getTransactionReport(filters?: { start_date?: string; end_date?: string; type?: string }): object {
    // Map frontend filter names to service filter names
    const serviceFilters: { type?: 'income' | 'expense'; date_from?: string; date_to?: string } = {}
    if (filters?.type) serviceFilters.type = filters.type as 'income' | 'expense'
    if (filters?.start_date) serviceFilters.date_from = filters.start_date
    if (filters?.end_date) serviceFilters.date_to = filters.end_date

    const transactions = this.transactionService.getFiltered(serviceFilters)

    const totals = {
      income: { TRY: 0, USD: 0, EUR: 0, total_try: 0 },
      expense: { TRY: 0, USD: 0, EUR: 0, total_try: 0 }
    }

    for (const t of transactions) {
      const type = t.type as 'income' | 'expense'
      const currency = t.currency as 'TRY' | 'USD' | 'EUR'

      if (totals[type][currency] !== undefined) {
        totals[type][currency] += t.net_amount
      }

      totals[type].total_try += t.amount_try || 0
    }

    return {
      transactions,
      totals,
      balance_try: totals.income.total_try - totals.expense.total_try
    }
  }

  getDebtReport(filters?: { kind?: string; start_date?: string; end_date?: string }): object {
    // Map frontend filter names - DebtService uses 'kind' which matches frontend
    const serviceFilters: { kind?: 'debt' | 'receivable' | 'payable' } = {}
    if (filters?.kind) {
      // Frontend may send 'receivable' or 'payable', map to service expected values
      serviceFilters.kind = filters.kind as 'debt' | 'receivable' | 'payable'
    }

    const debts = this.debtService.getFiltered(serviceFilters as { kind?: 'debt' | 'receivable'; party_id?: number; status?: 'open' | 'closed' })
    const today = formatDate(new Date())

    const totals = {
      debt: { principal: 0, paid: 0, remaining: 0 },
      receivable: { principal: 0, paid: 0, remaining: 0 }
    }

    const debtsWithTRY = debts.map(debt => {
      const date = debt.start_date || today
      const convPrincipal = this.currencyService.convertToTRY(debt.principal_amount, debt.currency, date)
      const convPaid = this.currencyService.convertToTRY(debt.total_paid || 0, debt.currency, date)
      const convRemaining = this.currencyService.convertToTRY(debt.remaining_amount || 0, debt.currency, date)

      totals[debt.kind].principal += convPrincipal.amount_try
      totals[debt.kind].paid += convPaid.amount_try
      totals[debt.kind].remaining += convRemaining.amount_try

      return {
        ...debt,
        principal_try: convPrincipal.amount_try,
        paid_try: convPaid.amount_try,
        remaining_try: convRemaining.amount_try
      }
    })

    return {
      debts: debtsWithTRY,
      totals,
      net_position: totals.receivable.remaining - totals.debt.remaining
    }
  }

  getSummaryReport(filters?: { start_date?: string; end_date?: string }): object {
    const today = formatDate(new Date())
    const startDate = filters?.start_date || today.substring(0, 8) + '01'
    const endDate = filters?.end_date || this.getLastDayOfMonth(today)

    // Transactions in date range
    const transactions = this.db.prepare(`
      SELECT * FROM transactions WHERE date >= ? AND date <= ?
    `).all(startDate, endDate) as { type: string; net_amount: number; currency: string; date: string }[]

    let totalIncome = 0
    let totalExpense = 0

    for (const t of transactions) {
      const conversion = this.currencyService.convertToTRY(t.net_amount, t.currency, t.date)
      if (t.type === 'income') {
        totalIncome += conversion.amount_try
      } else {
        totalExpense += conversion.amount_try
      }
    }

    // Open debts and receivables
    const openDebts = this.db.prepare(`
      SELECT d.*, (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN installments i ON p.related_id = i.id AND p.related_type = 'installment' WHERE i.debt_id = d.id) as total_paid
      FROM debts d WHERE d.status = 'open' AND d.kind = 'debt'
    `).all() as { id: number; principal_amount: number; currency: string; total_paid: number; due_date: string }[]

    const openReceivables = this.db.prepare(`
      SELECT d.*, (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN installments i ON p.related_id = i.id AND p.related_type = 'installment' WHERE i.debt_id = d.id) as total_paid
      FROM debts d WHERE d.status = 'open' AND d.kind = 'receivable'
    `).all() as { id: number; principal_amount: number; currency: string; total_paid: number; due_date: string }[]

    let totalReceivables = 0
    let totalPayables = 0
    let overdueReceivables = 0
    let overduePayables = 0

    for (const debt of openDebts) {
      const remaining = debt.principal_amount - debt.total_paid
      const conversion = this.currencyService.convertToTRY(remaining, debt.currency, today)
      totalPayables += conversion.amount_try
      if (debt.due_date < today) {
        overduePayables += conversion.amount_try
      }
    }

    for (const receivable of openReceivables) {
      const remaining = receivable.principal_amount - receivable.total_paid
      const conversion = this.currencyService.convertToTRY(remaining, receivable.currency, today)
      totalReceivables += conversion.amount_try
      if (receivable.due_date < today) {
        overdueReceivables += conversion.amount_try
      }
    }

    // Active projects
    const activeProjects = this.db.prepare(`
      SELECT p.*, COALESCE(collected.amount, 0) as collected_amount
      FROM projects p
      LEFT JOIN (
        SELECT project_id, SUM(net_amount) as amount FROM transactions WHERE type = 'income' GROUP BY project_id
      ) collected ON p.id = collected.project_id
      WHERE p.status = 'active'
    `).all() as { id: number; contract_amount: number; collected_amount: number; currency: string }[]

    let totalContractValue = 0
    let totalCollected = 0

    for (const project of activeProjects) {
      const convContract = this.currencyService.convertToTRY(project.contract_amount, project.currency, today)
      const convCollected = this.currencyService.convertToTRY(project.collected_amount || 0, project.currency, today)
      totalContractValue += convContract.amount_try
      totalCollected += convCollected.amount_try
    }

    return {
      total_income: Math.round(totalIncome * 100) / 100,
      total_expense: Math.round(totalExpense * 100) / 100,
      net_balance: Math.round((totalIncome - totalExpense) * 100) / 100,
      total_receivables: Math.round(totalReceivables * 100) / 100,
      total_payables: Math.round(totalPayables * 100) / 100,
      overdue_receivables: Math.round(overdueReceivables * 100) / 100,
      overdue_payables: Math.round(overduePayables * 100) / 100,
      active_projects: activeProjects.length,
      total_contract_value: Math.round(totalContractValue * 100) / 100,
      total_collected: Math.round(totalCollected * 100) / 100
    }
  }

  getProjectReport(filters?: { status?: string }): object {
    const projects = filters?.status
      ? this.projectService.getAll({ status: filters.status })
      : this.projectService.getAll()
    const today = formatDate(new Date())

    const totals = {
      contract_total: 0,
      collected_total: 0,
      remaining_total: 0
    }

    const projectsWithTRY = projects.map(project => {
      const date = project.start_date || today
      const convContract = this.currencyService.convertToTRY(project.contract_amount, project.currency, date)
      const convCollected = this.currencyService.convertToTRY(project.collected_amount || 0, project.currency, date)
      const convRemaining = this.currencyService.convertToTRY(project.remaining_amount || 0, project.currency, date)

      totals.contract_total += convContract.amount_try
      totals.collected_total += convCollected.amount_try
      totals.remaining_total += convRemaining.amount_try

      return {
        ...project,
        contract_try: convContract.amount_try,
        collected_try: convCollected.amount_try,
        remaining_try: convRemaining.amount_try
      }
    })

    return {
      projects: projectsWithTRY,
      totals
    }
  }

  exportCSV(reportType: string, filters?: object): string {
    switch (reportType) {
      case 'summary':
        return this.exportSummaryCSV(filters as { start_date?: string; end_date?: string })
      case 'transactions':
        return this.transactionService.exportToCSV(filters as { type?: 'income' | 'expense'; party_id?: number; category_id?: number; project_id?: number; date_from?: string; date_to?: string; currency?: string })
      case 'debts':
        return this.debtService.exportToCSV(filters as { kind?: 'debt' | 'receivable'; party_id?: number; status?: 'open' | 'closed' })
      case 'projects':
        return this.exportProjectsCSV()
      default:
        return ''
    }
  }

  private exportSummaryCSV(filters?: { start_date?: string; end_date?: string }): string {
    const summary = this.getSummaryReport(filters) as {
      total_income: number
      total_expense: number
      net_balance: number
      total_receivables: number
      total_payables: number
      overdue_receivables: number
      overdue_payables: number
      active_projects: number
      total_contract_value: number
      total_collected: number
    }

    let csv = 'Metrik;Değer (TRY)\n'
    csv += `Toplam Gelir;${summary.total_income.toFixed(2)}\n`
    csv += `Toplam Gider;${summary.total_expense.toFixed(2)}\n`
    csv += `Net Bakiye;${summary.net_balance.toFixed(2)}\n`
    csv += `Toplam Alacak;${summary.total_receivables.toFixed(2)}\n`
    csv += `Toplam Borç;${summary.total_payables.toFixed(2)}\n`
    csv += `Vadesi Geçmiş Alacak;${summary.overdue_receivables.toFixed(2)}\n`
    csv += `Vadesi Geçmiş Borç;${summary.overdue_payables.toFixed(2)}\n`
    csv += `Aktif Proje Sayısı;${summary.active_projects}\n`
    csv += `Toplam Sözleşme Değeri;${summary.total_contract_value.toFixed(2)}\n`
    csv += `Tahsil Edilen;${summary.total_collected.toFixed(2)}\n`

    return csv
  }

  private exportProjectsCSV(): string {
    const report = this.getProjectReport() as { projects: Array<{ title: string; party_name?: string; contract_amount: number; currency: string; collected_amount?: number; remaining_amount?: number; percentage?: number; status: string; start_date?: string; end_date?: string }> }

    let csv = 'Proje;Müşteri;Sözleşme Tutarı;Para Birimi;Tahsilat;Kalan;Tahsilat %;Durum;Başlangıç;Bitiş\n'

    for (const p of report.projects) {
      const status = {
        active: 'Aktif',
        completed: 'Tamamlandı',
        cancelled: 'İptal',
        on_hold: 'Beklemede'
      }[p.status] || p.status

      csv += `${p.title.replace(/;/g, ',')};${p.party_name || ''};${p.contract_amount.toFixed(2)};${p.currency};${(p.collected_amount || 0).toFixed(2)};${(p.remaining_amount || 0).toFixed(2)};${(p.percentage || 0).toFixed(2)};${status};${p.start_date || ''};${p.end_date || ''}\n`
    }

    return csv
  }

  private getLastDayOfMonth(date: string): string {
    const d = new Date(date)
    d.setMonth(d.getMonth() + 1)
    d.setDate(0)
    return formatDate(d)
  }

  getMonthlyChartData(months: number = 12): object[] {
    const today = new Date()
    const result: object[] = []
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

    // Determine start date based on months parameter
    let startDate: Date
    if (months === 0) {
      // All time: find earliest transaction date
      const earliest = this.db.prepare(`
        SELECT MIN(date) as min_date FROM transactions
      `).get() as { min_date: string | null }

      if (!earliest?.min_date) {
        return result // No transactions yet
      }

      const earliestDate = new Date(earliest.min_date)
      startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1)
    } else {
      // Specific number of months back
      startDate = new Date(today.getFullYear(), today.getMonth() - months + 1, 1)
    }

    // Iterate from start date to current month
    const currentDate = new Date(startDate)
    const endMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    while (currentDate <= endMonth) {
      const firstDay = formatDate(currentDate)
      const lastDay = this.getLastDayOfMonth(firstDay)

      const transactions = this.db.prepare(`
        SELECT type, net_amount, currency, date FROM transactions
        WHERE date >= ? AND date <= ?
      `).all(firstDay, lastDay) as { type: string; net_amount: number; currency: string; date: string }[]

      let income = 0
      let expense = 0

      for (const t of transactions) {
        const conversion = this.currencyService.convertToTRY(t.net_amount, t.currency, t.date)
        if (t.type === 'income') {
          income += conversion.amount_try
        } else {
          expense += conversion.amount_try
        }
      }

      result.push({
        month: firstDay.substring(0, 7),
        month_label: `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear().toString().slice(-2)}`,
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100
      })

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return result
  }

  getCategoryChartData(type: 'income' | 'expense' = 'expense', months: number = 6): object[] {
    const today = new Date()
    const end = formatDate(today)

    let start: string
    if (months === 0) {
      // All time: no date filter
      start = '1900-01-01'
    } else {
      const startDate = new Date(today.getFullYear(), today.getMonth() - months + 1, 1)
      start = formatDate(startDate)
    }

    const transactions = this.db.prepare(`
      SELECT t.category_id, c.name as category_name, t.net_amount, t.currency, t.date
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = ? AND t.date >= ? AND t.date <= ?
    `).all(type, start, end) as { category_id: number | null; category_name: string | null; net_amount: number; currency: string; date: string }[]

    const categoryTotals: Record<string, { category_id: number; category_name: string; total: number }> = {}

    for (const t of transactions) {
      const categoryId = t.category_id || 0
      const categoryName = t.category_name || 'Kategorisiz'
      const key = String(categoryId)

      if (!categoryTotals[key]) {
        categoryTotals[key] = { category_id: categoryId, category_name: categoryName, total: 0 }
      }

      const conversion = this.currencyService.convertToTRY(t.net_amount, t.currency, t.date)
      categoryTotals[key].total += conversion.amount_try
    }

    const sorted = Object.values(categoryTotals).sort((a, b) => b.total - a.total)
    const grandTotal = sorted.reduce((sum, item) => sum + item.total, 0)

    // Top 5 categories + others
    const result: object[] = []
    let othersTotal = 0

    sorted.forEach((item, index) => {
      if (index < 5) {
        result.push({
          category_id: item.category_id,
          category_name: item.category_name,
          total: Math.round(item.total * 100) / 100,
          percentage: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0
        })
      } else {
        othersTotal += item.total
      }
    })

    if (othersTotal > 0) {
      result.push({
        category_id: -1,
        category_name: 'Diğerleri',
        total: Math.round(othersTotal * 100) / 100,
        percentage: grandTotal > 0 ? (othersTotal / grandTotal) * 100 : 0
      })
    }

    return result
  }

  getDebtSummaryChartData(): object {
    const today = formatDate(new Date())

    // Get all open debts
    const debts = this.db.prepare(`
      SELECT d.*,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
         JOIN installments i ON p.related_id = i.id AND p.related_type = 'installment'
         WHERE i.debt_id = d.id) as total_paid
      FROM debts d WHERE d.status = 'open'
    `).all() as { id: number; kind: string; principal_amount: number; currency: string; due_date: string; total_paid: number }[]

    const summary = {
      debt_total: 0,
      debt_paid: 0,
      debt_remaining: 0,
      debt_overdue: 0,
      receivable_total: 0,
      receivable_paid: 0,
      receivable_remaining: 0,
      receivable_overdue: 0
    }

    for (const debt of debts) {
      const convPrincipal = this.currencyService.convertToTRY(debt.principal_amount, debt.currency, today)
      const convPaid = this.currencyService.convertToTRY(debt.total_paid || 0, debt.currency, today)
      const remaining = convPrincipal.amount_try - convPaid.amount_try
      const isOverdue = debt.due_date && debt.due_date < today

      if (debt.kind === 'debt') {
        summary.debt_total += convPrincipal.amount_try
        summary.debt_paid += convPaid.amount_try
        summary.debt_remaining += remaining
        if (isOverdue) summary.debt_overdue += remaining
      } else {
        summary.receivable_total += convPrincipal.amount_try
        summary.receivable_paid += convPaid.amount_try
        summary.receivable_remaining += remaining
        if (isOverdue) summary.receivable_overdue += remaining
      }
    }

    // Round all values
    Object.keys(summary).forEach(key => {
      summary[key as keyof typeof summary] = Math.round(summary[key as keyof typeof summary] * 100) / 100
    })

    return summary
  }
}
