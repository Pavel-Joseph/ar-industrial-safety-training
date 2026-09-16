import { Award, ClipboardList, Percent, Users } from 'lucide-react'
import { StatCard } from '../ui/StatCard'
import { useT } from '../../i18n/LanguageContext'

/**
 * The four headline figures, stacked down the left edge of the dashboard.
 * Every percentage is computed by the backend from the same rows that feed the
 * charts, so a disagreement between a tile and a chart is a real bug worth
 * reporting, not a rounding difference.
 */
export function StatRail({ summary }) {
  const { t } = useT()
  const s = summary

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
      <StatCard
        Icon={Users}
        label={t('stats.workers')}
        value={s.workers.total}
        percent={s.workers.startedPercent}
        percentLabel={t('stats.workersStarted')}
        footnote={`${s.workers.started} of ${s.workers.total} have at least one attempt`}
      />
      <StatCard
        Icon={ClipboardList}
        label={t('stats.attempts')}
        value={s.attempts.total}
        percent={s.attempts.offlineSyncedPercent}
        percentLabel={t('stats.attemptsOffline')}
        footnote={`${s.attempts.today} recorded today`}
      />
      <StatCard
        Icon={Percent}
        label={t('stats.passRate')}
        value={`${s.performance.overallPassPercent}%`}
        percent={s.performance.overallPassPercent}
        percentLabel={t('stats.passShare')}
        tone="steelLight"
        footnote={`${s.performance.passed} passed · ${s.performance.failed} failed`}
      />
      <StatCard
        Icon={Award}
        label={t('stats.certificates')}
        value={s.certificates.issued}
        percent={s.certificates.issuedPerPassPercent}
        percentLabel={t('stats.certificatesOfPasses')}
        footnote={`${s.certificates.revoked} revoked · ${s.workers.certifiedPercent}% of workers certified`}
      />
    </div>
  )
}
