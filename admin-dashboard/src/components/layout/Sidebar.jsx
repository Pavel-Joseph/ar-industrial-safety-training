import { NavLink } from 'react-router-dom'
import { BadgeCheck, ClipboardList, HardHat, LayoutDashboard } from 'lucide-react'
import { useT } from '../../i18n/LanguageContext'

const ITEMS = [
  { to: '/', key: 'nav.overview', Icon: LayoutDashboard, end: true },
  { to: '/workers', key: 'nav.workers', Icon: HardHat },
  { to: '/results', key: 'nav.results', Icon: ClipboardList },
  { to: '/certificates', key: 'nav.certificates', Icon: BadgeCheck }
]

export function Sidebar() {
  const { t } = useT()
  return (
    <nav
      aria-label="Main"
      className="flex gap-1 overflow-x-auto border-b border-stone/30 px-4 py-3
                 md:h-full md:w-60 md:flex-col md:overflow-visible md:border-b-0
                 md:border-r md:px-3 md:py-6"
    >
      <div className="mb-6 hidden px-2 md:block">
        <p className="font-display text-sm leading-tight text-sand">{t('app.name')}</p>
        <p className="mt-1 text-xs text-stone">Prototype build</p>
      </div>
      {ITEMS.map(({ to, key, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-ember/20 text-sand'
                : 'text-sand/65 hover:bg-bark/40 hover:text-sand'
            }`
          }
        >
          <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
          {t(key)}
        </NavLink>
      ))}
    </nav>
  )
}
