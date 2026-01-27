import { useEffect, useState } from 'react'
import { api } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/date'
import { pdf } from '@react-pdf/renderer'
import { SummaryReportPDF, TransactionReportPDF, DebtReportPDF, ProjectReportPDF } from '../components/pdf'

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
  const { t } = useTranslation()
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
          const summary = await api.getReportSummary(filterParams)
          setSummaryData(summary as SummaryData)
          break
        case 'transactions':
          const transactionResult = await api.getTransactionReport(filterParams) as { transactions: TransactionReport[] }
          setTransactionData(transactionResult.transactions || [])
          break
        case 'debts':
          const debtResult = await api.getDebtReport(filterParams) as { debts: DebtReport[] }
          setDebtData(debtResult.debts || [])
          break
        case 'projects':
          const projectResult = await api.getProjectReport(filterParams) as { projects: ProjectReport[] }
          setProjectData(projectResult.projects || [])
          break
      }
    } catch {
      addAlert('error', t('reports.reportFailed'))
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

      const result = await api.exportReport(activeReport, filterParams)
      if (result.success) {
        addAlert('success', result.message)
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('reports.exportFailed'))
    }
  }

  const handleExportPDF = async () => {
    try {
      addAlert('info', t('reports.pdfGenerating'))

      let doc = null
      const pdfFilters = {
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        type: filters.type || undefined,
        kind: filters.kind || undefined,
      }

      switch (activeReport) {
        case 'summary':
          if (!summaryData) return
          doc = <SummaryReportPDF data={summaryData} filters={pdfFilters} t={t} />
          break
        case 'transactions':
          doc = <TransactionReportPDF data={transactionData} filters={pdfFilters} t={t} />
          break
        case 'debts':
          doc = <DebtReportPDF data={debtData} filters={pdfFilters} t={t} />
          break
        case 'projects':
          doc = <ProjectReportPDF data={projectData} filters={pdfFilters} t={t} />
          break
      }

      if (doc) {
        const blob = await pdf(doc).toBlob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rapor_${activeReport}_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addAlert('success', t('reports.pdfSuccess'))
      }
    } catch (error) {
      console.error('PDF export error:', error)
      addAlert('error', t('reports.pdfFailed'))
    }
  }

  const renderFilters = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.startDate')}</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.endDate')}</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          {activeReport === 'transactions' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.transactionType')}</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">{t('common.all')}</option>
                <option value="income">{t('transactions.income')}</option>
                <option value="expense">{t('transactions.expense')}</option>
              </select>
            </div>
          )}
          {activeReport === 'debts' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.debtType')}</label>
              <select
                value={filters.kind}
                onChange={(e) => setFilters({ ...filters, kind: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">{t('common.all')}</option>
                <option value="receivable">{t('debts.receivable')}</option>
                <option value="payable">{t('debts.debt')}</option>
              </select>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('reports.downloadCSV')}
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('reports.downloadPDF')}
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
            <p className="text-sm text-gray-500 mb-2">{t('reports.totalIncome')}</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(summaryData.total_income, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-2">{t('reports.totalExpense')}</p>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(summaryData.total_expense, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-2">{t('reports.netBalance')}</p>
            <p className={`text-3xl font-bold ${summaryData.net_balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(summaryData.net_balance, 'TRY')}
            </p>
          </div>
        </div>

        {/* Receivables/Payables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.receivables')}</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('reports.totalReceivable')}</span>
                <span className="font-medium text-blue-600">{formatCurrency(summaryData.total_receivables, 'TRY')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('reports.overdue')}</span>
                <span className="font-medium text-red-600">{formatCurrency(summaryData.overdue_receivables, 'TRY')}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.payables')}</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('reports.totalDebt')}</span>
                <span className="font-medium text-orange-600">{formatCurrency(summaryData.total_payables, 'TRY')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('reports.overdue')}</span>
                <span className="font-medium text-red-600">{formatCurrency(summaryData.overdue_payables, 'TRY')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.projectSummary')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">{t('reports.activeProjectCount')}</p>
              <p className="text-2xl font-bold text-gray-900">{summaryData.active_projects}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('reports.contractTotal')}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.total_contract_value, 'TRY')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('reports.collected')}</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summaryData.total_collected, 'TRY')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('reports.collectionRate')}</p>
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
    const totalIncome = transactionData.filter(tr => tr.type === 'income').reduce((sum, tr) => sum + tr.amount, 0)
    const totalExpense = transactionData.filter(tr => tr.type === 'expense').reduce((sum, tr) => sum + tr.amount, 0)

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{t('reports.totalIncome')}</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{t('reports.totalExpense')}</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{t('reports.recordCount')}</p>
            <p className="text-2xl font-bold text-gray-900">{transactionData.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.party')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.category')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.amount')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactionData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">{t('common.noRecords')}</td>
                </tr>
              ) : (
                transactionData.map((tr) => (
                  <tr key={tr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(tr.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        tr.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tr.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tr.party_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tr.category_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={tr.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(tr.amount, tr.currency as 'TRY' | 'USD' | 'EUR')}
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
            <p className="text-sm text-gray-500">{t('reports.totalReceivable')}</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalReceivables, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{t('reports.totalDebt')}</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalPayables, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{t('reports.recordCount')}</p>
            <p className="text-2xl font-bold text-gray-900">{debtData.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.party')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.type')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('debts.principal')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('debts.paid')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('debts.remaining')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('debts.dueDate')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {debtData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">{t('common.noRecords')}</td>
                </tr>
              ) : (
                debtData.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.party_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        d.kind === 'receivable' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {d.kind === 'receivable' ? t('debts.receivable') : t('debts.debt')}
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
            <p className="text-sm text-gray-500">{t('reports.totalContract')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalContract, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{t('reports.collected')}</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected, 'TRY')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{t('reports.projectCount')}</p>
            <p className="text-2xl font-bold text-gray-900">{projectData.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('projects.projectName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('projects.customer')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('projects.contractAmount')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('projects.collection')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('projects.remainingAmount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projectData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">{t('common.noRecords')}</td>
                </tr>
              ) : (
                projectData.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.party_name || t('projects.internalProject')}</td>
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
                        {p.status === 'active' ? t('projects.active') :
                         p.status === 'completed' ? t('projects.completed') :
                         p.status === 'on_hold' ? t('projects.onHold') : t('projects.cancelled')}
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
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
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
            {t('reports.summaryReport')}
          </button>
          <button
            onClick={() => setActiveReport('transactions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeReport === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('reports.transactionReport')}
          </button>
          <button
            onClick={() => setActiveReport('debts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeReport === 'debts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('reports.debtReport')}
          </button>
          <button
            onClick={() => setActiveReport('projects')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeReport === 'projects'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('reports.projectReport')}
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
