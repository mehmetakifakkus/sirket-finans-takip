import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/date'

type ReportType = 'summary' | 'transactions' | 'debts' | 'projects'

interface SummaryData {
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

interface TransactionReport {
  id: number
  date: string
  type: string
  party_name: string
  category_name: string
  amount: number
  currency: string
  description: string
}

interface DebtReport {
  id: number
  party_name: string
  kind: string
  principal_amount: number
  total_paid: number
  remaining_amount: number
  due_date: string
  currency: string
  status: string
}

interface ProjectReport {
  id: number
  title: string
  party_name: string
  contract_amount: number
  collected_amount: number
  remaining_amount: number
  percentage: number
  currency: string
  status: string
}

export function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>('summary')
  const [loading, setLoading] = useState(true)
  const { addAlert } = useAppStore()

  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    type: '',
    kind: ''
  })

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [transactionData, setTransactionData] = useState<TransactionReport[]>([])
  const [debtData, setDebtData] = useState<DebtReport[]>([])
  const [projectData, setProjectData] = useState<ProjectReport[]>([])

  useEffect(() => {
    loadReport()
  }, [activeReport, filters])

  const loadReport = async () => {
    setLoading(true)
    try {
      const filterParams: Record<string, string | undefined> = {}
      if (filters.start_date) filterParams.start_date = filters.start_date
      if (filters.end_date) filterParams.end_date = filters.end_date
      if (filters.type) filterParams.type = filters.type
      if (filters.kind) filterParams.kind = filters.kind

      switch (activeReport) {
        case 'summary':
          const summary = await window.api.getReportSummary(filterParams)
          setSummaryData(summary as SummaryData)
          break
        case 'transactions':
          const transactions = await window.api.getTransactionReport(filterParams)
          setTransactionData(transactions as TransactionReport[])
          break
        case 'debts':
          const debts = await window.api.getDebtReport(filterParams)
          setDebtData(debts as DebtReport[])
          break
        case 'projects':
          const projects = await window.api.getProjectReport(filterParams)
          setProjectData(projects as ProjectReport[])
          break
      }
    } catch {
      addAlert('error', 'Rapor yuklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const filterParams: Record<string, string | undefined> = {}
      if (filters.start_date) filterParams.start_date = filters.start_date
      if (filters.end_date) filterParams.end_date = filters.end_date
      if (filters.type) filterParams.type = filters.type
      if (filters.kind) filterParams.kind = filters.kind

      const result = await window.api.exportReport(activeReport, filterParams)
      if (result.success) {
        addAlert('success', result.message)
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', 'Export basarisiz')
    }
  }

  const renderFilters = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Baslangic Tarihi</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Bitis Tarihi</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          {activeReport === 'transactions' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Islem Tipi</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Tumu</option>
                <option value="income">Gelir</option>
                <option value="expense">Gider</option>
              </select>
            </div>
          )}
          {activeReport === 'debts' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tur</label>
              <select
                value={filters.kind}
                onChange={(e) => setFilters({ ...filters, kind: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Tumu</option>
                <option value="receivable">Alacak</option>
                <option value="payable">Borc</option>
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV Indir
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderSummaryReport = () => {
    if (!summaryData) return null

    return (
      <div className="space-y-6">
        {/* Income/Expense Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-2">Toplam Gelir</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(summaryData.total_income, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-2">Toplam Gider</p>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(summaryData.total_expense, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-2">Net Bakiye</p>
            <p className={`text-3xl font-bold ${summaryData.net_balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(summaryData.net_balance, 'TRY')}
            </p>
          </div>
        </div>

        {/* Receivables/Payables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alacaklar</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Toplam Alacak</span>
                <span className="font-medium text-blue-600">{formatCurrency(summaryData.total_receivables, 'TRY')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vadesi Gecmis</span>
                <span className="font-medium text-red-600">{formatCurrency(summaryData.overdue_receivables, 'TRY')}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Borclar</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Toplam Borc</span>
                <span className="font-medium text-orange-600">{formatCurrency(summaryData.total_payables, 'TRY')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vadesi Gecmis</span>
                <span className="font-medium text-red-600">{formatCurrency(summaryData.overdue_payables, 'TRY')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Proje Ozeti</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Aktif Proje</p>
              <p className="text-2xl font-bold text-gray-900">{summaryData.active_projects}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sozlesme Toplami</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.total_contract_value, 'TRY')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tahsil Edilen</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summaryData.total_collected, 'TRY')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tahsilat Orani</p>
              <p className="text-2xl font-bold text-blue-600">
                {summaryData.total_contract_value > 0
                  ? ((summaryData.total_collected / summaryData.total_contract_value) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTransactionReport = () => {
    const totalIncome = transactionData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = transactionData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Toplam Gelir</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Toplam Gider</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Kayit Sayisi</p>
            <p className="text-2xl font-bold text-gray-900">{transactionData.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taraf</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactionData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Kayit bulunamadi</td>
                </tr>
              ) : (
                transactionData.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(t.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {t.type === 'income' ? 'Gelir' : 'Gider'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.party_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.category_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(t.amount, t.currency as 'TRY' | 'USD' | 'EUR')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderDebtReport = () => {
    const totalReceivables = debtData.filter(d => d.kind === 'receivable').reduce((sum, d) => sum + d.remaining_amount, 0)
    const totalPayables = debtData.filter(d => d.kind === 'payable').reduce((sum, d) => sum + d.remaining_amount, 0)

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Toplam Alacak</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalReceivables, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Toplam Borc</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalPayables, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Kayit Sayisi</p>
            <p className="text-2xl font-bold text-gray-900">{debtData.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taraf</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tur</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Anapara</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Odenen</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kalan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vade</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {debtData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Kayit bulunamadi</td>
                </tr>
              ) : (
                debtData.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.party_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        d.kind === 'receivable' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {d.kind === 'receivable' ? 'Alacak' : 'Borc'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(d.principal_amount, d.currency as 'TRY' | 'USD' | 'EUR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {formatCurrency(d.total_paid, d.currency as 'TRY' | 'USD' | 'EUR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-orange-600">
                      {formatCurrency(d.remaining_amount, d.currency as 'TRY' | 'USD' | 'EUR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(d.due_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderProjectReport = () => {
    const totalContract = projectData.reduce((sum, p) => sum + p.contract_amount, 0)
    const totalCollected = projectData.reduce((sum, p) => sum + p.collected_amount, 0)

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Toplam Sozlesme</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalContract, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Tahsil Edilen</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Proje Sayisi</p>
            <p className="text-2xl font-bold text-gray-900">{projectData.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proje</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Musteri</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sozlesme</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tahsilat</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kalan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projectData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Kayit bulunamadi</td>
                </tr>
              ) : (
                projectData.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.party_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(p.contract_amount, p.currency as 'TRY' | 'USD' | 'EUR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {formatCurrency(p.collected_amount, p.currency as 'TRY' | 'USD' | 'EUR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                      {formatCurrency(p.remaining_amount, p.currency as 'TRY' | 'USD' | 'EUR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        p.status === 'active' ? 'bg-green-100 text-green-800' :
                        p.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        p.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {p.status === 'active' ? 'Aktif' :
                         p.status === 'completed' ? 'Tamamlandi' :
                         p.status === 'on_hold' ? 'Beklemede' : 'Iptal'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
      </div>

      {/* Report Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveReport('summary')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeReport === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Ozet Rapor
          </button>
          <button
            onClick={() => setActiveReport('transactions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeReport === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Islem Raporu
          </button>
          <button
            onClick={() => setActiveReport('debts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeReport === 'debts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Borc/Alacak Raporu
          </button>
          <button
            onClick={() => setActiveReport('projects')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeReport === 'projects'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Proje Raporu
          </button>
        </nav>
      </div>

      {/* Filters */}
      {renderFilters()}

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeReport === 'summary' && renderSummaryReport()}
          {activeReport === 'transactions' && renderTransactionReport()}
          {activeReport === 'debts' && renderDebtReport()}
          {activeReport === 'projects' && renderProjectReport()}
        </>
      )}
    </div>
  )
}
