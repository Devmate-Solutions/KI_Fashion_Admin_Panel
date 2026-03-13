"use client"

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
  useState,
  Suspense,
} from "react"
import { usePathname, useSearchParams, useRouter } from "next/navigation"

// ---------------------------------------------------------------------------
// Types (JSDoc for plain JS projects — delete if using TypeScript)
// ---------------------------------------------------------------------------
/**
 * @typedef {{ pathname: string, search: string, full: string }} HistoryEntry
 *
 * @typedef {{
 *   goBack:      (fallbackPath?: string) => void
 *   goForward:   () => void
 *   canGoBack:   boolean
 *   canGoForward: boolean
 * }} NavigationHistoryContextValue
 */

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
/** @type {React.Context<NavigationHistoryContextValue | null>} */
const NavigationHistoryContext = createContext(null)

const MAX_HISTORY = 50
const SESSION_KEY  = "nav_history_stack"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a HistoryEntry from pathname + URLSearchParams */
function makeEntry(pathname, searchParams) {
  const search = searchParams.toString()
  return {
    pathname,
    search,
    full: search ? `${pathname}?${search}` : pathname,
  }
}

/**
 * Two entries are considered the "same page" when their pathnames match.
 * Query/tab changes on the same pathname are NOT treated as separate pages,
 * so navigating /stock?tab=1 → /stock?tab=2 won't push a back entry.
 * Only /stock → /profile pushes a back entry.
 *
 * The full URL (including search) is stored so that when we go back to
 * /stock, we restore whichever tab was active when we left.
 */
function isSamePage(a, b) {
  return a.pathname === b.pathname
}

/** Persist stack to sessionStorage so a refresh doesn't wipe history */
function persist(backStack, forwardStack) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ backStack, forwardStack })
    )
  } catch {
    // sessionStorage unavailable (SSR, private mode quota) — fail silently
  }
}

/** Rehydrate stack from sessionStorage */
function rehydrate() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return { backStack: [], forwardStack: [] }
    return JSON.parse(raw)
  } catch {
    return { backStack: [], forwardStack: [] }
  }
}

// ---------------------------------------------------------------------------
// Inner provider (needs useSearchParams → must be inside Suspense)
// ---------------------------------------------------------------------------
function NavigationHistoryInner({ children }) {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const router      = useRouter()

  const current = makeEntry(pathname, searchParams)

  // ---- stacks ---------------------------------------------------------------
  // backStack  : pages you can go BACK  to  (top = most recent previous page)
  // forwardStack: pages you can go FORWARD to (top = most recently backed-from)
  //
  // currentRef tracks the page we're on RIGHT NOW so the effect can diff.
  // ---------------------------------------------------------------------------
  const backStack     = useRef([])
  const forwardStack  = useRef([])
  const currentRef    = useRef(null)   // null until first effect run
  const isNavigating  = useRef(false)  // true while we're doing a programmatic nav

  // Expose canGoBack / canGoForward as state so buttons re-render correctly
  const [canGoBack,    setCanGoBack]    = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)

  // Sync derived booleans whenever the stacks change
  const syncFlags = useCallback(() => {
    setCanGoBack(backStack.current.length > 0)
    setCanGoForward(forwardStack.current.length > 0)
  }, [])

  // ---- rehydrate on mount ---------------------------------------------------
  useEffect(() => {
    const saved = rehydrate()
    backStack.current    = saved.backStack    ?? []
    forwardStack.current = saved.forwardStack ?? []
    syncFlags()
    // currentRef will be set by the path-change effect below
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- track page changes ---------------------------------------------------
  useEffect(() => {
    if (currentRef.current === null) {
      // First render — just record where we are, nothing to push
      currentRef.current = current
      return
    }

    if (isSamePage(currentRef.current, current)) {
      // Same page, different query (tab change etc.)
      // Update currentRef so we remember the latest tab, but don't touch stacks
      currentRef.current = current
      return
    }

    if (isNavigating.current) {
      // This route change was triggered by goBack / goForward —
      // stacks were already mutated there, just update currentRef
      isNavigating.current = false
      currentRef.current   = current
      syncFlags()
      return
    }

    // Normal forward navigation to a new page
    // Push current page onto back stack and clear forward stack
    // (forward history is invalidated whenever the user navigates forward
    //  manually — same algorithm browsers use)
    backStack.current.push(currentRef.current)
    if (backStack.current.length > MAX_HISTORY) {
      backStack.current = backStack.current.slice(-MAX_HISTORY)
    }
    forwardStack.current = []   // ← mirrors browser behaviour

    currentRef.current = current
    persist(backStack.current, forwardStack.current)
    syncFlags()
  }, [current.full]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- goBack ---------------------------------------------------------------
  const goBack = useCallback(
    (fallbackPath) => {
      if (backStack.current.length === 0) {
        router.push(fallbackPath || "/home")
        return
      }

      // Pop from back, push current to forward
      const prev = backStack.current.pop()
      forwardStack.current.push(currentRef.current)

      isNavigating.current = true
      persist(backStack.current, forwardStack.current)
      router.push(prev.full)   // full = pathname + original search/tab params
    },
    [router]
  )

  // ---- goForward ------------------------------------------------------------
  const goForward = useCallback(() => {
    if (forwardStack.current.length === 0) return

    // Pop from forward, push current to back
    const next = forwardStack.current.pop()
    backStack.current.push(currentRef.current)

    isNavigating.current = true
    persist(backStack.current, forwardStack.current)
    router.push(next.full)
  }, [router])

  return (
    <NavigationHistoryContext.Provider
      value={{ goBack, goForward, canGoBack, canGoForward }}
    >
      {children}
    </NavigationHistoryContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Public provider
// ---------------------------------------------------------------------------
export function NavigationHistoryProvider({ children }) {
  return (
    <Suspense fallback={null}>
      <NavigationHistoryInner>{children}</NavigationHistoryInner>
    </Suspense>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useNavigationHistory() {
  const context = useContext(NavigationHistoryContext)
  if (!context) {
    throw new Error(
      "useNavigationHistory must be used within a NavigationHistoryProvider"
    )
  }
  return context
}