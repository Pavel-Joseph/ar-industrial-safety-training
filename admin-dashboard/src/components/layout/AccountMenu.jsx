import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Database, LogOut, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useT } from '../../i18n/LanguageContext'
import { USE_LOCAL_STORE } from '../../config/env'
import { hasSampleData, loadSampleData, removeSampleData } from '../../api/sampleData'

/**
 * The account control. Clicking it opens the administrator's details, plus -
 * in local mode only - the controls for the sample records.
 *
 * The sample controls are rendered behind USE_LOCAL_STORE, so when the backend
 * is connected this menu shows account details and sign out and nothing else.
 */
export function AccountMenu() {
  const { user, signOut } = useAuth()
  const { t } = useT()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [sampleLoaded, setSampleLoaded] = useState(() => USE_LOCAL_STORE && hasSampleData())
  const wrapRef = useRef(null)

  useEffect(() => {
    function onPointer(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  function handleSample() {
    if (sampleLoaded) {
      removeSampleData()
      setSampleLoaded(false)
    } else {
      loadSampleData()
      setSampleLoaded(true)
    }
    // Every page reads its figures on mount, so a reload is the simplest way to
    // be certain nothing is showing a stale count.
    window.location.reload()
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2.5 rounded-md border border-stone/35 px-2.5 py-1.5
                   text-left transition-colors hover:border-copper"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-steel font-display text-xs text-warm">
          {initials}
        </span>
        <span className="hidden sm:block">
          <span className="block text-xs leading-tight text-warm">{user?.name}</span>
          <span className="block text-[11px] leading-tight text-stone">{t('account.role')}</span>
        </span>
        <ChevronDown size={14} className="text-stone" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-72 rounded-lg border border-stone/30 bg-charcoal p-4 shadow-panel"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded bg-steel font-display text-sm text-warm">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm text-warm">{user?.name}</span>
              <span className="block truncate font-mono text-[11px] text-stone">{user?.email}</span>
            </span>
          </div>

          <dl className="mt-4 space-y-2 border-t border-stone/25 pt-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-stone">{t('account.roleLabel')}</dt>
              <dd className="text-warm">{user?.role ?? 'admin'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone">{t('account.source')}</dt>
              <dd className="text-warm">
                {USE_LOCAL_STORE ? t('account.sourceLocal') : t('account.sourceLive')}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone">{t('account.permissions')}</dt>
              <dd className="text-right text-warm">{t('account.permissionsValue')}</dd>
            </div>
          </dl>

          {USE_LOCAL_STORE && (
            <div className="mt-4 border-t border-stone/25 pt-3">
              <p className="text-[11px] leading-relaxed text-stone">{t('account.sampleHelp')}</p>
              <button type="button" onClick={handleSample} className="btn-ghost mt-2.5 w-full justify-center">
                {sampleLoaded ? <Trash2 size={14} aria-hidden="true" /> : <Database size={14} aria-hidden="true" />}
                {sampleLoaded ? t('account.sampleRemove') : t('account.sampleLoad')}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="btn-ghost mt-3 w-full justify-center"
          >
            <LogOut size={14} aria-hidden="true" />
            {t('nav.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}
