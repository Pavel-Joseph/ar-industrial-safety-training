import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../api'
import { LANGUAGES } from '../../i18n/strings'

const BLANK = { name: '', workerCode: '', phone: '', site: '', preferredLanguage: 'hi' }

/**
 * Registering a worker. This is the one place the dashboard writes data, and
 * the new worker appears in the list and in the dashboard counts immediately
 * because the caller reloads from the API rather than patching local state.
 */
export function AddWorkerDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const firstFieldRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm(BLANK)
      setError(null)
      firstFieldRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const worker = await api.createWorker(form)
      onCreated(worker)
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldError = (key) => error?.details?.[key]

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-charcoal/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-worker-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="panel w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-worker-title" className="font-display text-lg">Register a worker</h2>
            <p className="mt-1 text-sm text-stone">
              They can sign in to the AR app with the worker code once registered.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-stone hover:text-warm">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="w-name" className="mb-1.5 block text-xs text-stone">
              Full name <span className="text-copper">*</span>
            </label>
            <input
              id="w-name"
              ref={firstFieldRef}
              className="field"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {fieldError('name') && <p className="mt-1 text-xs text-rust">{fieldError('name')}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="w-code" className="mb-1.5 block text-xs text-stone">Worker code</label>
              <input
                id="w-code"
                className="field font-mono"
                placeholder="assigned automatically"
                value={form.workerCode}
                onChange={(e) => setForm({ ...form, workerCode: e.target.value })}
              />
              {fieldError('workerCode') && (
                <p className="mt-1 text-xs text-rust">{fieldError('workerCode')}</p>
              )}
            </div>
            <div>
              <label htmlFor="w-phone" className="mb-1.5 block text-xs text-stone">Phone</label>
              <input
                id="w-phone"
                className="field"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="w-site" className="mb-1.5 block text-xs text-stone">Site</label>
              <input
                id="w-site"
                className="field"
                value={form.site}
                onChange={(e) => setForm({ ...form, site: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="w-lang" className="mb-1.5 block text-xs text-stone">Training language</label>
              <select
                id="w-lang"
                className="field"
                value={form.preferredLanguage}
                onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && !error.details && (
            <p role="alert" className="rounded border border-rust/50 bg-rust/10 px-3 py-2 text-sm text-warm">
              {error.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Registering' : 'Register worker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
