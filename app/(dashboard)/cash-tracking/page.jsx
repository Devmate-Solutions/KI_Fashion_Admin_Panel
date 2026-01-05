"use client"

import { useState } from "react"
import { useDailyCashSummary } from "@/lib/hooks/useCashTracking"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function currency(n) {
  const num = Number(n || 0)
  return `£${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function CashTrackingPage() {
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  
  const { data: cashData, isLoading, error } = useDailyCashSummary(selectedDate)

  const transactions = cashData?.transactions || []
  const cashInTransactions = transactions.filter(t => t.type === 'cash_in')
  const cashOutTransactions = transactions.filter(t => t.type === 'cash_out')

  return (
    <div className="mx-auto max-w-[1600px] p-4">
      <div className="pb-4">
        <h1 className="text-lg font-semibold tracking-tight">Daily Cash Tracking</h1>
        <p className="text-sm text-muted-foreground">Track cash flow on a daily basis</p>
      </div>

      {/* Date Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedDate(today)}
              className="mt-6"
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Error loading cash data</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      ) : cashData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Opening Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currency(cashData.openingBalance || 0)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">
                  Cash In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {currency(cashData.cashIn || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">
                  Cash Out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {currency(cashData.cashOut || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Closing Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currency(cashData.closingBalance || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash In */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Cash In</CardTitle>
              </CardHeader>
              <CardContent>
                {cashInTransactions.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No cash in transactions for this date
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cashInTransactions.map((transaction, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{transaction.category}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {transaction.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(transaction.date).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            {currency(transaction.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Cash In</span>
                        <span className="font-bold text-green-600">
                          {currency(cashData.cashIn || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cash Out */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Cash Out</CardTitle>
              </CardHeader>
              <CardContent>
                {cashOutTransactions.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No cash out transactions for this date
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cashOutTransactions.map((transaction, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border bg-red-50 dark:bg-red-950/20"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{transaction.category}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {transaction.description}
                          </div>
                          {transaction.vendor && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Vendor: {transaction.vendor}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(transaction.date).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-600">
                            {currency(transaction.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Cash Out</span>
                        <span className="font-bold text-red-600">
                          {currency(cashData.cashOut || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>No cash data available for the selected date</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

