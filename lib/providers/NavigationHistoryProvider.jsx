"use client"

import { createContext, useContext, useRef, useCallback } from "react"
import { usePathname, useSearchParams, useRouter } from "next/navigation"

const NavigationHistoryContext = createContext(null)

export function NavigationHistoryProvider({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Full URL including query string (e.g. '/stock?tab=3')
  const fullPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname

  // Stack of previous full URLs
  const historyStack = useRef([])
  const currentPathRef = useRef(null)
  // Flag set before a back-navigation so the resulting route change is NOT
  // pushed onto the stack — otherwise it would create the cycling bug.
  const isGoingBack = useRef(false)

  if (currentPathRef.current !== fullPath) {
    if (isGoingBack.current) {
      // We navigated backwards — discard the flag, don't push to stack
      isGoingBack.current = false
    } else if (currentPathRef.current !== null) {
      // Normal forward navigation — save where we were
      historyStack.current.push(currentPathRef.current)
    }
    currentPathRef.current = fullPath
  }

  const goBack = useCallback(
    (fallbackPath) => {
      if (historyStack.current.length > 0) {
        const prev = historyStack.current.pop()
        isGoingBack.current = true
        router.push(prev)
      } else {
        router.push(fallbackPath)
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

export function useNavigationHistory() {
  const context = useContext(NavigationHistoryContext)
  if (!context) {
    throw new Error(
      "useNavigationHistory must be used within a NavigationHistoryProvider"
    )
  }
  return context
}
