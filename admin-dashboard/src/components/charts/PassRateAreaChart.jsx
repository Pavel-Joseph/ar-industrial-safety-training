import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { CHART, tooltipStyle } from './chartTheme'
import { MODULE_SHORT_LABELS } from '../../config/modules'
import { shortDay } from '../../lib/format'
import { EmptyState } from '../ui/DataState'

/**
 * Pass rate per training module, one filled band per module.
 *
 * Input is the contract's PassRateSeries. A module with no attempts on a given
 * day is absent from that point, which is deliberate: plotting it as 0% would
 * claim everyone failed. `connectNulls` bridges the gap instead.
 */
function toRows(series) {
  return series.points.map((point) => {
    const row = { date: point.date, label: shortDay(point.date) }
    series.modules.forEach((code) => {
      row[code] = point[code]?.passPercent ?? null
      row[`${code}_attempts`] = point[code]?.attempts ?? 0
    })
    return row
  })
}

function PassRateTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle.contentStyle} className="px-3 py-2">
      <p style={tooltipStyle.labelStyle}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs">
          <span style={{ color: entry.color }}>{MODULE_SHORT_LABELS[entry.dataKey]}</span>
          {': '}
          {entry.value == null ? 'no attempts' : `${entry.value}% of ${entry.payload[`${entry.dataKey}_attempts`]} attempts`}
        </p>
      ))}
    </div>
  )
}

export function PassRateAreaChart({ series, height = 300 }) {
  if (!series?.points?.length) {
    return <EmptyState title="No attempts recorded yet" body="The chart fills in once workers start finishing modules." />
  }
  const rows = toRows(series)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {series.modules.map((code) => (
            <linearGradient key={code} id={`fill-${code}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART[code]} stopOpacity={0.45} />
              <stop offset="100%" stopColor={CHART[code]} stopOpacity={0.04} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid stroke={CHART.grid} strokeOpacity={0.35} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHART.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          minTickGap={12}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: CHART.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip content={<PassRateTooltip />} cursor={tooltipStyle.cursor} />
        <Legend
          formatter={(value) => (
            <span style={{ color: CHART.text, fontSize: 12 }}>{MODULE_SHORT_LABELS[value]}</span>
          )}
          iconType="plainline"
        />
        {series.modules.map((code) => (
          <Area
            key={code}
            type="monotone"
            dataKey={code}
            name={code}
            stroke={CHART[code]}
            strokeWidth={2}
            fill={`url(#fill-${code})`}
            connectNulls
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
