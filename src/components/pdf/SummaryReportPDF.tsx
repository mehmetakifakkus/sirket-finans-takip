import { Document, Page, Text, View } from '@react-pdf/renderer'
import { styles, formatCurrencyPDF, formatDatePDF } from './PDFStyles'

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

interface Props {
  data: SummaryData
  filters: {
    start_date?: string
    end_date?: string
  }
  t: (key: string) => string
}

export function SummaryReportPDF({ data, filters, t }: Props) {
  const collectionRate = data.total_contract_value > 0
    ? ((data.total_collected / data.total_contract_value) * 100).toFixed(1)
    : '0'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('reports.summaryReport')}</Text>
            <Text style={styles.subtitle}>{t('app.title')}</Text>
          </View>
          <View>
            <Text style={styles.dateRange}>
              {formatDatePDF(new Date().toISOString())}
            </Text>
            {(filters.start_date || filters.end_date) && (
              <Text style={styles.dateRange}>
                {filters.start_date && formatDatePDF(filters.start_date)}
                {filters.start_date && filters.end_date && ' - '}
                {filters.end_date && formatDatePDF(filters.end_date)}
              </Text>
            )}
          </View>
        </View>

        {/* Income/Expense Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('transactions.title')}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.totalIncome')}</Text>
              <Text style={[styles.summaryValue, styles.greenText]}>
                {formatCurrencyPDF(data.total_income)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.totalExpense')}</Text>
              <Text style={[styles.summaryValue, styles.redText]}>
                {formatCurrencyPDF(data.total_expense)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.netBalance')}</Text>
              <Text style={[styles.summaryValue, data.net_balance >= 0 ? styles.blueText : styles.redText]}>
                {formatCurrencyPDF(data.net_balance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Receivables/Payables Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('debts.title')}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.totalReceivable')}</Text>
              <Text style={[styles.summaryValue, styles.blueText]}>
                {formatCurrencyPDF(data.total_receivables)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.overdue')}</Text>
              <Text style={[styles.summaryValue, styles.redText]}>
                {formatCurrencyPDF(data.overdue_receivables)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.totalDebt')}</Text>
              <Text style={[styles.summaryValue, styles.orangeText]}>
                {formatCurrencyPDF(data.total_payables)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.overdue')}</Text>
              <Text style={[styles.summaryValue, styles.redText]}>
                {formatCurrencyPDF(data.overdue_payables)}
              </Text>
            </View>
          </View>
        </View>

        {/* Projects Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('reports.projectSummary')}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.activeProjectCount')}</Text>
              <Text style={[styles.summaryValue, styles.grayText]}>
                {data.active_projects}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.contractTotal')}</Text>
              <Text style={[styles.summaryValue, styles.grayText]}>
                {formatCurrencyPDF(data.total_contract_value)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.collected')}</Text>
              <Text style={[styles.summaryValue, styles.greenText]}>
                {formatCurrencyPDF(data.total_collected)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.collectionRate')}</Text>
              <Text style={[styles.summaryValue, styles.blueText]}>
                {collectionRate}%
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{t('app.version')}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
