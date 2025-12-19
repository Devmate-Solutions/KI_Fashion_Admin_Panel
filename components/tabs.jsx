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
              className={`px-3 py-2 text-sm rounded-t-[4px] border-b-2 -mb-px ${
                selected
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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
            className="pt-4"
          >
            {!hidden && t.content}
          </section>
        )
      })}
    </div>
  )
}
