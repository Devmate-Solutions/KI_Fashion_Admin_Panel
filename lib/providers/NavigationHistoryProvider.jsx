"use client"

import { createContext, useContext, useRef, useCallback, useEffect, Suspense } from "react"
import { usePathname, useSearchParams, useRouter } from "next/navigation"

const NavigationHistoryContext = createContext(null)

const MAX_HISTORY = 50

function NavigationHistoryInner({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Full URL including query string (e.g. '/stock?tab=3')
  const fullPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname

  // Stack of previous full URLs
  const historyStack = useRef([])
  const currentPathRef = useRef(fullPath)  // initialise to current path
  // Flag set before a back-navigation so the resulting route change is NOT
  // pushed onto the stack — otherwise it would create the cycling bug.
  const isGoingBack = useRef(false)

  // Track path changes in useEffect to avoid side-effects during render.
  // This fixes the React Strict Mode double-push bug.
  useEffect(() => {
    if (currentPathRef.current !== fullPath) {
      if (isGoingBack.current) {
        // We navigated backwards — discard the flag, don't push to stack
        isGoingBack.current = false
      } else if (currentPathRef.current !== null) {
        // Normal forward navigation — save where we were
        historyStack.current.push(currentPathRef.current)
        // Cap the stack size to prevent unbounded growth
        if (historyStack.current.length > MAX_HISTORY) {
          historyStack.current = historyStack.current.slice(-MAX_HISTORY)
        }
      }
      currentPathRef.current = fullPath
    }
  }, [fullPath])

  const goBack = useCallback(
    (fallbackPath) => {
      if (historyStack.current.length > 0) {
        const prev = historyStack.current.pop()
        isGoingBack.current = true
        router.push(prev)
      } else {
        router.push(fallbackPath || "/home")
      }
    },
    [router]
  )

  return (
    <NavigationHistoryContext.Provider value={{ goBack }}>
      {children}
    </NavigationHistoryContext.Provider>
  )
}

export function NavigationHistoryProvider({ children }) {
  return (
    <Suspense fallback={null}>
      <NavigationHistoryInner>{children}</NavigationHistoryInner>
    </Suspense>
  )
}

export function useNavigationHistory() {
  const context = useContext(NavigationHistoryContext)
  if (!context) {
    throw new Error(
      "useNavigationHistory must be used within a NavigationHistoryProvider"
    )
  }
  return context
}
