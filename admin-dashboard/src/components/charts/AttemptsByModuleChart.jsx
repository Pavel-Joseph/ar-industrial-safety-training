import {
  Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { CHART, tooltipStyle } from './chartTheme'
import { MODULE_SHORT_LABELS } from '../../api'
import { EmptyState } from '../ui/DataState'

/**
 * How many attempts each module received, split into passed and failed.
 *
 * Passed and failed are stacked rather than shown as one plain bar, so a module
 * with many attempts and few passes cannot hide behind a tall column. Every
 * segment carries its own value and the stack total is printed above the bar,
 * so the chart is readable without hovering - which matters on a projector.
 */
function ValueLabel({ x, y, width, value }) {
  if (!value) return null
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill={CHART.text}
      fontSize={12}
      fontWeight={600}
    >
      {value}
    </text>
  )
}

export function AttemptsByModuleChart({ data, height = 300 }) {
  const rows = (data?.modules ?? []).map((m) => ({
    ...m,
    label: MODULE_SHORT_LABELS[m.moduleCode] ?? m.label,
    total: m.attempts
  }))

  if (!rows.length || rows.every((r) => r.attempts === 0)) {
    return (
      <EmptyState
        title="No attempts in this period"
        body="Bars appear as soon as the AR app submits an assessment for a module."
      />
    )
  }

  const max = Math.max(...rows.map((r) => r.total))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 24, right: 8, left: -20, bottom: 4 }} barCategoryGap="28%">
        <CartesianGrid stroke={CHART.grid} strokeOpacity={0.3} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHART.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, Math.max(4, Math.ceil(max * 1.25))]}
          tick={{ fill: CHART.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={46}
        />
        <Tooltip
          cursor={{ fill: 'rgba(84,87,72,0.18)' }}
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          itemStyle={tooltipStyle.itemStyle}
        />
        <Legend
          formatter={(value) => <span style={{ color: CHART.text, fontSize: 12 }}>{value}</span>}
        />
        <Bar dataKey="passed" name="Passed" stackId="a" fill={CHART.pass} isAnimationActive={false}>
          <LabelList dataKey="passed" position="center" fill={CHART.onFill} fontSize={11} fontWeight={600}
                     formatter={(v) => (v ? v : '')} />
        </Bar>
        <Bar dataKey="failed" name="Failed" stackId="a" fill={CHART.fail} radius={[3, 3, 0, 0]}
             isAnimationActive={false}>
          <LabelList dataKey="failed" position="center" fill={CHART.onFill} fontSize={11} fontWeight={600}
                     formatter={(v) => (v ? v : '')} />
          <LabelList dataKey="total" content={ValueLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
