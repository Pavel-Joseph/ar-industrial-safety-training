import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { api } from '../api'
import { USE_LOCAL_STORE } from '../config/env'
import { useApi } from '../hooks/useApi'
import { useT } from '../i18n/LanguageContext'
import { Card } from '../components/ui/Card'
import { AsyncBlock, ErrorState, Loading } from '../components/ui/DataState'
import { StatRail } from '../components/dashboard/StatRail'
import { AttemptsByModuleChart } from '../components/charts/AttemptsByModuleChart'
import { PassRateAreaChart } from '../components/charts/PassRateAreaChart'
import { PassFailRadarChart } from '../components/charts/PassFailRadarChart'

/**
 * Nothing here is invented. Every figure is computed from workers an
 * administrator registered and attempts the AR app submitted, so a brand new
 * installation correctly shows zeros until real data arrives.
 */
export default function Dashboard() {
  const { t } = useT()
  const summary = useApi(() => api.getOverview(), [])
  const byModule = useApi(() => api.getAttemptsByModule({ days: 7 }), [])
  const series = useApi(() => api.getPassRateSeries({ days: 14 }), [])
  const breakdown = useApi(() => api.getPassFailBreakdown(), [])

  const noWorkers = summary.data?.workers.total === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-stone">{t('dashboard.subtitle')}</p>
        </div>
        <Link to="/workers" className="btn-primary">
          <UserPlus size={15} aria-hidden="true" />
          {t('workers.add')}
        </Link>
      </div>

      {summary.loading && <Loading rows={3} />}
      {summary.error && <ErrorState error={summary.error} onRetry={summary.reload} />}

      {summary.data && (
        <>
          {noWorkers && (
            <div className="panel border-copper/40 bg-copper/10 px-5 py-4">
              <p className="font-display text-warm">No workers registered yet</p>
              <p className="mt-1 max-w-2xl text-sm text-warm/75">
                The dashboard starts empty on purpose. Register your first worker on the workers
                page, and their assessments will appear here as soon as the AR app submits them.
                {USE_LOCAL_STORE &&
                  ' To see how the screens read before real assessments exist, load the sample records from the account menu.'}
              </p>
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
            {/* Left rail: the four headline figures, stacked vertically. */}
            <StatRail summary={summary.data} />

            <div className="grid gap-5">
              <div className="grid gap-5 2xl:grid-cols-[1.25fr_1fr]">
                <Card title={t('chart.attempts.title')} subtitle={t('chart.attempts.subtitle')}>
                  <AsyncBlock loading={byModule.loading} error={byModule.error} onRetry={byModule.reload}>
                    <AttemptsByModuleChart data={byModule.data} />
                  </AsyncBlock>
                </Card>

                <Card title={t('chart.passFail.title')} subtitle={t('chart.passFail.subtitle')}>
                  <AsyncBlock loading={breakdown.loading} error={breakdown.error} onRetry={breakdown.reload}>
                    <PassFailRadarChart breakdown={breakdown.data} />
                  </AsyncBlock>
                </Card>
              </div>

              <Card title={t('chart.passRate.title')} subtitle={t('chart.passRate.subtitle')}>
                <AsyncBlock loading={series.loading} error={series.error} onRetry={series.reload}>
                  <PassRateAreaChart series={series.data} />
                </AsyncBlock>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
