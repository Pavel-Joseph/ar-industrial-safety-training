import { USE_LOCAL_STORE } from '../config/env'
import * as live from './services.live'
import * as local from './services.local'

/**
 * The only API import a page is allowed to use.
 *
 * Both modules export the same function names and return the same shapes, so
 * switching VITE_USE_LOCAL_STORE to false points every screen at Person 2's
 * server without touching a single component.
 */
export const api = USE_LOCAL_STORE ? local : live

export { ApiError } from './client'
export { ENDPOINTS, LANGUAGE_LABELS } from './contract'
export { MODULE_CATALOG, MODULE_CODES, MODULE_LABELS, MODULE_SHORT_LABELS } from '../config/modules'
