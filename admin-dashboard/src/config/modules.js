/**
 * The training catalogue. This is configuration, not sample data: these are the
 * modules the AR app actually ships, and the same three codes are used by Unity,
 * the backend and this dashboard.
 *
 * If Person 1 adds or renames a module, change it here and tell Person 2 the
 * same day. Nothing else in the dashboard hard-codes a module.
 */
export const MODULE_CATALOG = [
  {
    code: 'fire',
    name: 'Fire & Explosion Response',
    shortName: 'Fire & Explosion',
    status: 'required',
    durationMinutes: 12,
    summary:
      'Recognise an ignition risk, reach the nearest safe exit, choose the correct extinguisher and complete the evacuation in the right order.',
    objectives: [
      'Identify marked and unmarked exits from the current position',
      'Select the right extinguisher class for the fire in view',
      'Perform the extinguisher sequence on the overlaid hazard',
      'Complete evacuation in the correct order without re-entering the zone'
    ]
  },
  {
    code: 'gas',
    name: 'Gas Leak & Confined Space Protocol',
    shortName: 'Gas & Confined Space',
    status: 'required',
    durationMinutes: 14,
    summary:
      'Read the hazard zone, put on the right protective equipment and follow buddy-system procedure before entering a confined space.',
    objectives: [
      'Recognise the hazard zone boundary projected on the real surroundings',
      'Select correct PPE for the detected gas condition',
      'Follow the buddy-system check before entry',
      'Trigger the withdrawal procedure when the reading crosses the limit'
    ]
  },
  {
    code: 'mine',
    name: 'Mine-Worker Module',
    shortName: 'Mine-Worker',
    status: 'bonus',
    durationMinutes: 10,
    summary:
      'Site-specific hazards for Jharkhand mine workers. Attempted only once both required modules pass the acceptance gate.',
    objectives: [
      'Recognise site-specific hazards around haulage and working faces',
      'Apply local reporting procedure for an unsafe condition',
      'Confirm assembly point and headcount procedure'
    ]
  }
]

export const MODULE_CODES = MODULE_CATALOG.map((m) => m.code)

export const MODULE_LABELS = Object.fromEntries(
  MODULE_CATALOG.map((m) => [m.code, m.name])
)

export const MODULE_SHORT_LABELS = Object.fromEntries(
  MODULE_CATALOG.map((m) => [m.code, m.shortName])
)

export const REQUIRED_MODULE_CODES = MODULE_CATALOG
  .filter((m) => m.status === 'required')
  .map((m) => m.code)
