import { useTranslation } from 'react-i18next'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '../../utils/currency'

interface CategoryData {
  category_id: number
  category_name: string
  total: number
  percentage: number
}

interface Props {
  data: CategoryData[]
  title?: string
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899']

export function CategoryPieChart({ data, title }: Props) {
  const { t } = useTranslation()

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryData }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{item.category_name}</p>
          <p className="text-sm text-gray-600">{formatCurrency(item.total, 'TRY')}</p>
          <p className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = (props: {
    cx?: number | string
    cy?: number | string
    midAngle?: number
    innerRadius?: number
    outerRadius?: number
    percent?: number
  }) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
    if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || !percent || percent < 0.05) return null

    const RADIAN = Math.PI / 180
    const cxNum = typeof cx === 'string' ? parseFloat(cx) : cx
    const cyNum = typeof cy === 'string' ? parseFloat(cy) : cy
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cxNum + radius * Math.cos(-midAngle * RADIAN)
    const y = cyNum + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={500}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {title || t('charts.categoryDistribution')}
        </h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          {t('common.noRecords')}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {title || t('charts.categoryDistribution')}
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="total"
              nameKey="category_name"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
