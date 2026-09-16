import { NavLink } from 'react-router-dom'
import {
  BadgeCheck, ClipboardList, GraduationCap, Info, LayoutDashboard, ShieldCheck, HardHat
} from 'lucide-react'
import { useT } from '../../i18n/LanguageContext'
import { LANGUAGES } from '../../i18n/strings'
import { AccountMenu } from './AccountMenu'

const NAV = [
  { to: '/', key: 'nav.dashboard', Icon: LayoutDashboard, end: true },
  { to: '/workers', key: 'nav.workers', Icon: HardHat },
  { to: '/results', key: 'nav.results', Icon: ClipboardList },
  { to: '/certificates', key: 'nav.certificates', Icon: BadgeCheck },
  { to: '/training-modules', key: 'nav.modules', Icon: GraduationCap },
  { to: '/about', key: 'nav.about', Icon: Info }
]

/**
 * Two rows on purpose.
 *
 * Row one carries identity and account controls. Row two carries navigation,
 * centred and given the full width of the page. Putting six destinations on the
 * same line as the brand and the account menu left every item squeezed; moving
 * them to their own row gives each one room and makes the active item obvious.
 */
export function Topbar() {
  const { language, setLanguage, t } = useT()

  return (
    <header className="border-b border-stone/25 bg-steel/10">
      {/* Row 1 — identity and account */}
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-copper text-charcoal">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold text-warm">
              {t('app.name')}
            </span>
            <span className="block truncate text-xs text-stone">{t('app.tagline')}</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="sr-only" htmlFor="language">Language</label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="field w-auto py-1.5 text-xs"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <AccountMenu />
        </div>
      </div>

      {/* Row 2 — navigation, centred across the full page width */}
      <div className="border-t border-stone/20">
        <nav aria-label="Main" className="mx-auto max-w-[1400px] px-4 md:px-6">
          <ul className="flex items-center justify-start gap-1 overflow-x-auto py-2 md:justify-center">
            {NAV.map(({ to, key, Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-copper font-medium text-charcoal'
                        : 'text-warm/70 hover:bg-graphite hover:text-warm'
                    }`
                  }
                >
                  <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span className="whitespace-nowrap">{t(key)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
