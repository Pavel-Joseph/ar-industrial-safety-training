import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * One loading/empty/error state machine for every page, so no page invents its
 * own. `deps` works like useEffect deps: change them and the call re-runs.
 */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const latest = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps)

  const load = useCallback(async () => {
    const ticket = ++latest.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await run()
      if (ticket === latest.current) setState({ data, loading: false, error: null })
    } catch (error) {
      if (ticket === latest.current) setState({ data: null, loading: false, error })
    }
  }, [run])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}

/** Keeps fast typing in the search box from firing a request per keystroke. */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
