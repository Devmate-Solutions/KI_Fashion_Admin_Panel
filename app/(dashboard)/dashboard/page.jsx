"use client"

import Tabs from "../../../components/tabs"

function KPI({ label, value, trend }) {
  return (
    <div className="rounded-[4px] border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {trend && (
        <div className={`mt-1 text-xs ${trend > 0 ? "text-green-600" : "text-destructive"}`}>
          {trend > 0 ? "+" : ""}
          {trend}% vs last week
        </div>
      )}
    </div>
  )
}

function MiniBar({ data = [] }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-4 bg-primary/70"
          style={{ height: `${(v / max) * 100}%`, borderRadius: 2 }}
          aria-label={`bar-${i}`}
        />
      ))}
    </div>
  )
}

export default function HomePage() {
  const tabs = [
    {
      label: "Total",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Total Sales" value="$124,500" trend={6.4} />
            <KPI label="Receivables" value="$32,200" trend={-2.3} />
            <KPI label="Payables" value="$18,770" trend={1.1} />
            <KPI label="Active Customers" value="418" />
          </div>
          <div className="rounded-[4px] border border-border p-4">
            <div className="mb-3 text-sm font-medium">Weekly Sales</div>
            <MiniBar data={[12, 18, 14, 22, 28, 19, 24]} />
          </div>
        </div>
      ),
    },
    {
      label: "Sales by Customer",
      content: (
        <div className="rounded-[4px] border border-border p-4">
          <ol className="text-sm space-y-2">
            <li className="flex justify-between">
              <span>Paula / Millie</span>
              <span>$4,920</span>
            </li>
            <li className="flex justify-between">
              <span>Farhan (WG)</span>
              <span>$3,110</span>
            </li>
            <li className="flex justify-between">
              <span>Sal Lavade</span>
              <span>$2,540</span>
            </li>
            <li className="flex justify-between">
              <span>Himmat</span>
              <span>$2,220</span>
            </li>
          </ol>
        </div>
      ),
    },
    {
      label: "Supplier",
      content: (
        <div className="rounded-[4px] border border-border p-4">
          <ul className="text-sm grid grid-cols-2 gap-2">
            <li className="flex justify-between">
              <span>Top Supplier A</span>
              <span>$8,230</span>
            </li>
            <li className="flex justify-between">
              <span>Top Supplier B</span>
              <span>$6,910</span>
            </li>
            <li className="flex justify-between">
              <span>Avg Lead Time</span>
              <span>4.2 days</span>
            </li>
            <li className="flex justify-between">
              <span>Fill Rate</span>
              <span>95%</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      label: "Summary by Products",
      content: (
        <div className="rounded-[4px] border border-border p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Denim Jacket</span>
              <span>1,220</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Leather Belt</span>
              <span>940</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cotton Tee</span>
              <span>2,140</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Formal Shoes</span>
              <span>680</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "Receivables",
      content: (
        <div className="rounded-[4px] border border-border p-4">
          <div className="text-sm">
            Outstanding receivables this month: <strong>$32,200</strong>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">Aging: 0-30: 68%, 31-60: 22%, 61+: 10%</div>
        </div>
      ),
    },
    {
      label: "Payables",
      content: (
        <div className="rounded-[4px] border border-border p-4">
          <div className="text-sm">
            Outstanding payables this month: <strong>$18,770</strong>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">Aging: 0-30: 74%, 31-60: 20%, 61+: 6%</div>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-[1600px] p-4">
      <div className="pb-4">
        <h1 className="text-lg font-semibold tracking-tight text-balance">Home</h1>
        <p className="text-sm text-muted-foreground">Overview and key metrics</p>
      </div>
      <Tabs tabs={tabs} />
    </div>
  )
}
