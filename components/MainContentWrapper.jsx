"use client"

import { useEffect, useState } from "react"

export default function MainContentWrapper({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    // Check initial state
    const checkSidebarState = () => {
      const collapsed = document.body.getAttribute('data-sidebar-collapsed') === 'true'
      setSidebarCollapsed(collapsed)
    }

    checkSidebarState()

    // Watch for changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-sidebar-collapsed') {
          checkSidebarState()
        }
      })
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-sidebar-collapsed']
    })

    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style jsx global>{`
        body[data-sidebar-collapsed="true"] main {
          margin-left: 5rem;
        }
        body[data-sidebar-collapsed="false"] main,
        body:not([data-sidebar-collapsed]) main {
          margin-left: 16rem;
        }
        @media (max-width: 768px) {
          body main {
            margin-left: 0 !important;
          }
        }
      `}</style>
      {children}
    </>
  )
}
