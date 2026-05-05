"use client"

import { useId, useState } from "react"

export default function Tabs({ tabs, defaultTab = 0, activeTab, onTabChange, className = "" }) {
  const [internalCurrent, setInternalCurrent] = useState(defaultTab)
  const isControlled = activeTab !== undefined && onTabChange !== undefined
  const current = isControlled ? activeTab : internalCurrent
  const setCurrent = isControlled ? onTabChange : setInternalCurrent
  const idBase = useId()

  return (
    <div className={className}>
      <div role="tablist" aria-label="Tabs" className="flex items-center gap-1 border-b border-border">
        {tabs.map((t, i) => {
          const selected = i === current
          return (
            <button
              key={t.label}
              role="tab"
              id={`${idBase}-tab-${i}`}
              aria-selected={selected}
              aria-controls={`${idBase}-panel-${i}`}
              onClick={() => setCurrent(i)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-all duration-200 ease-in-out ${selected
                  ? "border-primary text-foreground bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {tabs.map((t, i) => {
        const hidden = i !== current
        return (
          <section
            key={t.label}
            role="tabpanel"
            id={`${idBase}-panel-${i}`}
            aria-labelledby={`${idBase}-tab-${i}`}
            hidden={hidden}
            className={`pt-4 transition-all duration-300 ease-in-out ${hidden ? "opacity-0 hidden" : "opacity-100 animate-in fade-in slide-in-from-top-2"
              }`}
          >
            {!hidden && t.content}
          </section>
        )
      })}
    </div>
  )
}
