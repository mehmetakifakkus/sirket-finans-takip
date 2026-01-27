import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '../../utils/currency'

interface DebtSummary {
  debt_total: number
  debt_paid: number
  debt_remaining: number
  debt_overdue: number
  receivable_total: number
  receivable_paid: number
  receivable_remaining: number
  receivable_overdue: number
}

interface Props {
  data: DebtSummary
}

export function DebtReceivableBarChart({ data }: Props) {
  const { t } = useTranslation()

  const chartData = [
    {
      name: t('debts.receivable'),
      paid: data.receivable_paid,
      remaining: data.receivable_remaining - data.receivable_overdue,
      overdue: data.receivable_overdue,
    },
    {
      name: t('debts.debt'),
      paid: data.debt_paid,
      remaining: data.debt_remaining - data.debt_overdue,
      overdue: data.debt_overdue,
    },
  ]

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; fill: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.fill }} className="text-sm">
              {entry.dataKey === 'paid' && t('charts.paid')}
              {entry.dataKey === 'remaining' && t('charts.remaining')}
              {entry.dataKey === 'overdue' && t('charts.overdue')}
              : {formatCurrency(entry.value, 'TRY')}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('charts.debtReceivableSummary')}
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => {
                if (value === 'paid') return t('charts.paid')
                if (value === 'remaining') return t('charts.remaining')
                if (value === 'overdue') return t('charts.overdue')
                return value
              }}
            />
            <Bar dataKey="paid" stackId="a" fill="#22c55e" name="paid" />
            <Bar dataKey="remaining" stackId="a" fill="#3b82f6" name="remaining" />
            <Bar dataKey="overdue" stackId="a" fill="#ef4444" name="overdue" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
