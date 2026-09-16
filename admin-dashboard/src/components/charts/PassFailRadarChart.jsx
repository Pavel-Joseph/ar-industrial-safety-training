import {
  Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, Tooltip
} from 'recharts'
import { CHART, tooltipStyle } from './chartTheme'
import { EmptyState } from '../ui/DataState'
import { MODULE_SHORT_LABELS } from '../../config/modules'

/**
 * Pass and fail share, as a spider chart.
 *
 * Each axis is a module, plus a final axis for all modules combined, so the
 * total pass and fail percentage is readable directly off the chart. The two
 * series on any axis always add up to 100%, which is what makes the shape
 * meaningful: a wide green web is a healthy programme.
 */

export function buildRadarData(breakdown) {
  if (!breakdown) return []
  const rows = breakdown.modules
    .filter((m) => m.attempts > 0)
    .map((m) => ({
      axis: MODULE_SHORT_LABELS[m.moduleCode] ?? m.label,
      pass: m.passPercent,
      fail: m.failPercent,
      attempts: m.attempts
    }))

  rows.push({
    axis: 'All modules',
    pass: breakdown.totals.passPercent,
    fail: breakdown.totals.failPercent,
    attempts: breakdown.totals.attempts
  })
  return rows
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div style={tooltipStyle.contentStyle} className="px-3 py-2">
      <p style={tooltipStyle.labelStyle}>{row.axis}</p>
      <p className="text-xs" style={{ color: CHART.pass }}>Passed: {row.pass}%</p>
      <p className="text-xs" style={{ color: CHART.fail }}>Failed: {row.fail}%</p>
      <p className="text-xs" style={{ color: CHART.axis }}>{row.attempts} attempts</p>
    </div>
  )
}

export function PassFailRadarChart({ breakdown, height = 300 }) {
  const data = buildRadarData(breakdown)

  // A spider chart needs at least three axes to read as a shape.
  if (data.length < 3) {
    return (
      <EmptyState
        title="Not enough modules yet"
        body="The spider chart needs attempts in at least two modules before the shape means anything."
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={CHART.grid} strokeOpacity={0.5} />
        <PolarAngleAxis dataKey="axis" tick={{ fill: CHART.axis, fontSize: 11 }} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tickCount={5}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: CHART.axis, fontSize: 10 }}
          axisLine={false}
        />
        <Radar
          name="Passed"
          dataKey="pass"
          stroke={CHART.pass}
          fill={CHART.pass}
          fillOpacity={0.32}
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Radar
          name="Failed"
          dataKey="fail"
          stroke={CHART.fail}
          fill={CHART.fail}
          fillOpacity={0.22}
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Tooltip content={<RadarTooltip />} />
        <Legend formatter={(value) => <span style={{ color: CHART.text, fontSize: 12 }}>{value}</span>} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
