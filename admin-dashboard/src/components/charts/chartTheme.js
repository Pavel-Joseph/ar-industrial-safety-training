/**
 * Chart colours, taken straight from the platform palette.
 *
 * Every module gets a tone that is distinct from the pass/fail pair, so a
 * stacked bar and a module band can never be confused for each other.
 */
export const CHART = {
  fire: '#B87333',  // Copper Metal
  gas: '#5F82A8',   // Steel Blue, lifted for legibility on charcoal
  mine: '#8A8F95',  // Stone Gray

  pass: '#5F82A8',  // Steel Blue, lifted
  fail: '#A55222',  // Rust Orange

  grid: '#8A8F95',
  axis: '#8A8F95',
  surface: '#2A2E33',
  onFill: '#2A2E33', // text printed on top of a filled bar segment
  text: '#C49A75'
}

export const tooltipStyle = {
  contentStyle: {
    background: '#2A2E33',
    border: '1px solid #3B526A',
    borderRadius: 6,
    fontSize: 12,
    color: '#C49A75'
  },
  labelStyle: { color: '#C49A75', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#C49A75' },
  cursor: { stroke: '#8A8F95', strokeDasharray: '3 3' }
}
