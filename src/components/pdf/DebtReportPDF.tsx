import { Document, Page, Text, View } from '@react-pdf/renderer'
import { styles, formatCurrencyPDF, formatDatePDF } from './PDFStyles'

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

interface Props {
  data: DebtReport[]
  filters: {
    start_date?: string
    end_date?: string
    kind?: string
  }
  t: (key: string) => string
}

export function DebtReportPDF({ data, filters, t }: Props) {
  const totalReceivables = data.filter(d => d.kind === 'receivable').reduce((sum, d) => sum + d.remaining_amount, 0)
  const totalPayables = data.filter(d => d.kind === 'debt' || d.kind === 'payable').reduce((sum, d) => sum + d.remaining_amount, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('reports.debtReport')}</Text>
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
              <Text style={styles.summaryLabel}>{t('reports.totalReceivable')}</Text>
              <Text style={[styles.summaryValue, styles.blueText]}>
                {formatCurrencyPDF(totalReceivables)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.totalDebt')}</Text>
              <Text style={[styles.summaryValue, styles.orangeText]}>
                {formatCurrencyPDF(totalPayables)}
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
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>{t('transactions.party')}</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%' }]}>{t('common.type')}</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellRight, { width: '18%' }]}>{t('debts.principal')}</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellRight, { width: '15%' }]}>{t('debts.paid')}</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellRight, { width: '17%' }]}>{t('debts.remaining')}</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>{t('debts.dueDate')}</Text>
          </View>

          {/* Table Rows */}
          {data.map((d, index) => (
            <View key={d.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { width: '22%' }]}>{d.party_name}</Text>
              <View style={{ width: '13%' }}>
                <Text style={[styles.badge, d.kind === 'receivable' ? styles.receivableBadge : styles.debtBadge]}>
                  {d.kind === 'receivable' ? t('debts.receivable') : t('debts.debt')}
                </Text>
              </View>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: '18%' }]}>
                {formatCurrencyPDF(d.principal_amount, d.currency)}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellRight, styles.greenText, { width: '15%' }]}>
                {formatCurrencyPDF(d.total_paid, d.currency)}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellRight, styles.orangeText, { width: '17%' }]}>
                {formatCurrencyPDF(d.remaining_amount, d.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{formatDatePDF(d.due_date)}</Text>
            </View>
          ))}

          {/* Total Row */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { width: '53%' }]}>{t('common.total')}</Text>
            <Text style={[styles.totalValue, styles.blueText, { width: '15%', textAlign: 'right' }]}>
              {t('debts.receivable')}: {formatCurrencyPDF(totalReceivables)}
            </Text>
            <Text style={[styles.totalValue, styles.orangeText, { width: '32%', textAlign: 'right' }]}>
              {t('debts.debt')}: {formatCurrencyPDF(totalPayables)}
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
