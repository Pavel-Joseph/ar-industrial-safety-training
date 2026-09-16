import { Clock, Flame, HardHat, Languages, ShieldCheck, Smartphone, Wind } from 'lucide-react'
import { api, MODULE_CATALOG } from '../api'
import { useApi } from '../hooks/useApi'
import { useT } from '../i18n/LanguageContext'
import { ProgressBar } from '../components/ui/ProgressBar'

const ICONS = { fire: Flame, gas: Wind, mine: HardHat }

const HOW_IT_WORKS = [
  {
    Icon: Smartphone,
    title: 'Delivered where the hazard is',
    body:
      'The worker opens the module on an ordinary Android phone and points the camera at the area in front of them. Exits, hazard zones and equipment are drawn over the real surroundings, so the drill is practised in the place it would actually happen.'
  },
  {
    Icon: ShieldCheck,
    title: 'Assessed, not just watched',
    body:
      'Each module records which actions were taken, in what order, and how long they took. The server scores the attempt against a fixed rule set and decides pass or fail — the phone never decides it, and a retry never overwrites an earlier attempt.'
  },
  {
    Icon: Languages,
    title: 'In the worker\u2019s own language',
    body:
      'Instructions and feedback are available in Hindi and Santali as well as English, reviewed by a native speaker. Training content and assessment also work with no signal, and results upload once the phone reconnects.'
  }
]

/**
 * What the AR programme teaches. The explanation comes first, the modules
 * themselves are the large panels underneath. Descriptions are fixed content;
 * the figures under each panel are live.
 */
export default function TrainingModules() {
  const { t } = useT()
  const breakdown = useApi(() => api.getPassFailBreakdown(), [])

  const statsFor = (code) =>
    breakdown.data?.modules.find((m) => m.moduleCode === code) ?? null

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-2xl leading-tight">{t('modules.title')}</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-warm/80">
          {t('modules.subtitle')}
        </p>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-warm/80">
          A worker passes a module by scoring 70% or more on a single attempt. Passing both required
          modules completes their training and makes them eligible for a competency record. The
          bonus module is site-specific and never counts against a worker who has not attempted it.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map(({ Icon, title, body }) => (
            <article key={title} className="panel p-5">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-copper/20 text-copper">
                <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <h2 className="mt-3.5 font-display text-base">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-warm/75">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl">{t('modules.listHeading')}</h2>
        <p className="mt-1 text-sm text-stone">{t('modules.listIntro')}</p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {MODULE_CATALOG.map((module) => {
            const Icon = ICONS[module.code] ?? Flame
            const stats = statsFor(module.code)
            return (
              <article key={module.code} className="panel flex flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-copper/20 text-copper">
                    <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[11px] ${
                      module.status === 'required'
                        ? 'border-steelLight/50 bg-steelLight/10 text-steelLight'
                        : 'border-stone/40 bg-stone/10 text-stone'
                    }`}
                  >
                    {module.status === 'required' ? 'Required' : 'Bonus'}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-lg leading-tight">{module.name}</h3>
                <p className="mt-1 font-mono text-xs text-stone">{module.code}</p>
                <p className="mt-3 text-sm leading-relaxed text-warm/80">{module.summary}</p>

                <h4 className="mt-5 font-display text-sm text-warm/85">What the worker must do</h4>
                <ul className="mt-2 space-y-1.5">
                  {module.objectives.map((objective) => (
                    <li key={objective} className="flex gap-2.5 text-sm text-warm/75">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-copper" aria-hidden="true" />
                      {objective}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6">
                  <div className="flex items-center gap-4 border-t border-stone/25 pt-4 text-xs text-stone">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={13} aria-hidden="true" />
                      about {module.durationMinutes} minutes
                    </span>
                    <span>Pass mark 70%</span>
                  </div>

                  <div className="mt-3">
                    {stats && stats.attempts > 0 ? (
                      <>
                        <ProgressBar value={stats.passPercent} label={`${module.name} pass rate`} />
                        <p className="mt-2 text-xs text-stone">
                          {stats.attempts} attempts · {stats.passed} passed · {stats.failed} failed
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-stone">No attempts recorded for this module yet.</p>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
