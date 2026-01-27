import { StyleSheet, Font } from '@react-pdf/renderer'

// Register custom font for Turkish characters
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
})

export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  dateRange: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  summaryCard: {
    width: '33%',
    padding: 10,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  greenText: {
    color: '#10b981',
  },
  redText: {
    color: '#ef4444',
  },
  blueText: {
    color: '#3b82f6',
  },
  orangeText: {
    color: '#f97316',
  },
  grayText: {
    color: '#374151',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  tableCell: {
    fontSize: 9,
    color: '#1f2937',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 8,
    color: '#9ca3af',
  },
  pageNumber: {
    textAlign: 'right',
  },
  badge: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  incomeBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  expenseBadge: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  receivableBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  debtBadge: {
    backgroundColor: '#ffedd5',
    color: '#9a3412',
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  completedBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  holdBadge: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
  cancelledBadge: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#f3f4f6',
    borderTopWidth: 2,
    borderTopColor: '#d1d5db',
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
})

export const formatCurrencyPDF = (amount: number, currency: string = 'TRY'): string => {
  const symbols: Record<string, string> = { TRY: 'TL', USD: '$', EUR: 'EUR' }
  const symbol = symbols[currency] || currency
  const formattedAmount = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${formattedAmount} ${symbol}`
}

export const formatDatePDF = (dateStr: string): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
