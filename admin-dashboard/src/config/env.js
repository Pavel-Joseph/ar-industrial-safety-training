export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/**
 * false  -> every screen reads from Person 2's backend (live mode)
 * true   -> records are kept in this browser only (local mode), so the
 *           interface can be built and shown before the API is reachable
 */
export const USE_LOCAL_STORE =
  String(import.meta.env.VITE_USE_LOCAL_STORE ?? 'true').toLowerCase() === 'true'

export const PUBLIC_VERIFY_BASE_URL =
  import.meta.env.VITE_PUBLIC_VERIFY_BASE_URL ?? `${window.location.origin}/verify`

/** Local-mode sign-in only. In live mode the backend authenticates. */
export const LOCAL_ADMIN = {
  email: (import.meta.env.VITE_LOCAL_ADMIN_EMAIL ?? 'admin@arsafety.local').toLowerCase(),
  password: import.meta.env.VITE_LOCAL_ADMIN_PASSWORD ?? 'admin123',
  name: 'Site Administrator'
}

export const TOKEN_KEY = 'ar_admin_token'
export const USER_KEY = 'ar_admin_user'
