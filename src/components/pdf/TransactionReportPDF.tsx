import { Document, Page, Text, View } from '@react-pdf/renderer'
import { styles, formatCurrencyPDF, formatDatePDF } from './PDFStyles'

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

interface Props {
  data: TransactionReport[]
  filters: {
    start_date?: string
    end_date?: string
    type?: string
  }
  t: (key: string) => string
}

export function TransactionReportPDF({ data, filters, t }: Props) {
  const totalIncome = data.filter(tr => tr.type === 'income').reduce((sum, tr) => sum + tr.amount, 0)
  const totalExpense = data.filter(tr => tr.type === 'expense').reduce((sum, tr) => sum + tr.amount, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('reports.transactionReport')}</Text>
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

        {/* Summary */}
        <View style={styles.section}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.totalIncome')}</Text>
              <Text style={[styles.summaryValue, styles.greenText]}>
                {formatCurrencyPDF(totalIncome)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.totalExpense')}</Text>
              <Text style={[styles.summaryValue, styles.redText]}>
                {formatCurrencyPDF(totalExpense)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.recordCount')}</Text>
              <Text style={[styles.summaryValue, styles.grayText]}>
                {data.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>{t('common.date')}</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>{t('common.type')}</Text>
            <Text style={[styles.tableHeaderCell, { width: '23%' }]}>{t('transactions.party')}</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>{t('transactions.category')}</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellRight, { width: '15%' }]}>{t('common.amount')}</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>{t('common.currency')}</Text>
          </View>

          {/* Table Rows */}
          {data.map((tr, index) => (
            <View key={tr.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { width: '15%' }]}>{formatDatePDF(tr.date)}</Text>
              <View style={{ width: '12%' }}>
                <Text style={[styles.badge, tr.type === 'income' ? styles.incomeBadge : styles.expenseBadge]}>
                  {tr.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                </Text>
              </View>
              <Text style={[styles.tableCell, { width: '23%' }]}>{tr.party_name || '-'}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{tr.category_name || '-'}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, tr.type === 'income' ? styles.greenText : styles.redText, { width: '15%' }]}>
                {formatCurrencyPDF(tr.amount, tr.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{tr.currency}</Text>
            </View>
          ))}

          {/* Total Row */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { width: '70%' }]}>{t('common.total')}</Text>
            <Text style={[styles.totalValue, styles.greenText, { width: '15%', textAlign: 'right' }]}>
              {formatCurrencyPDF(totalIncome)}
            </Text>
            <Text style={[styles.totalValue, styles.redText, { width: '15%', textAlign: 'right' }]}>
              {formatCurrencyPDF(totalExpense)}
            </Text>
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
