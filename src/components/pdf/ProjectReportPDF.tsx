import { Document, Page, Text, View } from '@react-pdf/renderer'
import { styles, formatCurrencyPDF, formatDatePDF } from './PDFStyles'

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

interface Props {
  data: ProjectReport[]
  filters: {
    start_date?: string
    end_date?: string
  }
  t: (key: string) => string
}

export function ProjectReportPDF({ data, filters, t }: Props) {
  const totalContract = data.reduce((sum, p) => sum + p.contract_amount, 0)
  const totalCollected = data.reduce((sum, p) => sum + p.collected_amount, 0)

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active': return styles.activeBadge
      case 'completed': return styles.completedBadge
      case 'on_hold': return styles.holdBadge
      default: return styles.cancelledBadge
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('projects.active')
      case 'completed': return t('projects.completed')
      case 'on_hold': return t('projects.onHold')
      default: return t('projects.cancelled')
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('reports.projectReport')}</Text>
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
              <Text style={styles.summaryLabel}>{t('reports.totalContract')}</Text>
              <Text style={[styles.summaryValue, styles.grayText]}>
                {formatCurrencyPDF(totalContract)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.collected')}</Text>
              <Text style={[styles.summaryValue, styles.greenText]}>
                {formatCurrencyPDF(totalCollected)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('reports.projectCount')}</Text>
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
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>{t('projects.projectName')}</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>{t('projects.customer')}</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellRight, { width: '17%' }]}>{t('projects.contractAmount')}</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellRight, { width: '17%' }]}>{t('projects.collection')}</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellRight, { width: '17%' }]}>{t('projects.remainingAmount')}</Text>
            <Text style={[styles.tableHeaderCell, { width: '14%' }]}>{t('common.status')}</Text>
          </View>

          {/* Table Rows */}
          {data.map((p, index) => (
            <View key={p.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { width: '20%' }]}>{p.title}</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{p.party_name || t('projects.internalProject')}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: '17%' }]}>
                {formatCurrencyPDF(p.contract_amount, p.currency)}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellRight, styles.greenText, { width: '17%' }]}>
                {formatCurrencyPDF(p.collected_amount, p.currency)}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellRight, styles.orangeText, { width: '17%' }]}>
                {formatCurrencyPDF(p.remaining_amount, p.currency)}
              </Text>
              <View style={{ width: '14%' }}>
                <Text style={[styles.badge, getStatusBadgeStyle(p.status)]}>
                  {getStatusLabel(p.status)}
                </Text>
              </View>
            </View>
          ))}

          {/* Total Row */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { width: '35%' }]}>{t('common.total')}</Text>
            <Text style={[styles.totalValue, { width: '17%', textAlign: 'right' }]}>
              {formatCurrencyPDF(totalContract)}
            </Text>
            <Text style={[styles.totalValue, styles.greenText, { width: '17%', textAlign: 'right' }]}>
              {formatCurrencyPDF(totalCollected)}
            </Text>
            <Text style={[styles.totalValue, styles.orangeText, { width: '17%', textAlign: 'right' }]}>
              {formatCurrencyPDF(totalContract - totalCollected)}
            </Text>
            <Text style={{ width: '14%' }}></Text>
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
