"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import BackButton from "@/components/BackButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Printer, RefreshCw, FileDown, AlertCircle } from "lucide-react"

export default function ReportLayout({
  title,
  description,
  dateRange,
  onDateChange,
  onRefresh,
  loading = false,
  error = null,
  children,
  summary = [],
  onExport = null,
  showBeginningButton = false,
}) {
  const printRef = useRef(null)

  const handlePrint = () => {
    window.print()
  }

  const formatDateForInput = (date) => {
    if (!date) return ""
    if (typeof date === "string") return date
    return date.toISOString().split("T")[0]
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Non-printable header controls */}
      <div className="no-print p-4 md:p-6 border-b bg-card">
        <div className="max-w-[1600px] mx-auto">
          {/* Back button */}
          <div className="mb-3">
            <BackButton fallbackPath="/reports" label="Back to Reports" />
          </div>
          {/* Title and actions */}
          <div className="flex flex-col  md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-row w-full justify-between gap-4">
              <h3 className="text-lg mb-1 md:text-2xl font-bold">{title}</h3>
             <div className="space-x-1">
               {onRefresh && (
                <Button 
                  onClick={onRefresh} 
                  variant="outline" 
                  size="sm"
                  disabled={loading}
                  className="h-9"
                >
                  <RefreshCw className={`h-4 w-4  ${loading ? 'animate-spin' : ''}`} />
                  
                </Button>
              )}
              
              {onExport && (
                <Button 
                  onClick={onExport} 
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="h-9 bg-green-600 hover:bg-green-700 text-white"
                >
                  <FileDown className="h-6 w-6 " />
                  
                </Button>
              )}
              
              <Button 
                onClick={handlePrint} 
                size="sm"
                className="h-9 bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" />
                
              </Button>
             </div>
            </div>
            
          </div>
            {/* Date Range and Actions */}
            <div className="flex flex-wrap items-end gap-3">
              {dateRange && onDateChange && (
                <>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="fromDate" className="text-xs">From Date</Label>
                    <div className="flex gap-1">
                      {showBeginningButton && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs px-2 whitespace-nowrap"
                          onClick={() => onDateChange({ ...dateRange, from: "" })}
                          title="Reset to beginning of records"
                        >
                          Beginning
                        </Button>
                      )}
                      <Input
                        id="fromDate"
                        type="date"
                        value={formatDateForInput(dateRange.from)}
                        onChange={(e) => onDateChange({ ...dateRange, from: e.target.value })}
                        className="w-40 h-9"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="toDate" className="text-xs">To Date</Label>
                    <Input
                      id="toDate"
                      type="date"
                      value={formatDateForInput(dateRange.to)}
                      onChange={(e) => onDateChange({ ...dateRange, to: e.target.value })}
                      className="w-40 h-9"
                    />
                  </div>
                </>
              )}
              
             
            </div>
        </div>
      </div>

      {/* Printable content area */}
      <div ref={printRef} className="p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Print Header - Only visible when printing */}
          <div className="print-only hidden print:block mb-6">
            <div className="text-center border-b-2 border-black pb-4 mb-4">
              <h1 className="text-2xl font-bold">KI FASHION</h1>
              <p className="text-sm text-gray-600">Business Management System</p>
            </div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                {dateRange && (
                  <p className="text-sm">
                    Period: {new Date(dateRange.from).toLocaleDateString('en-GB')} to{' '}
                    {new Date(dateRange.to).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
              <div className="text-right text-sm">
                <p>Generated: {new Date().toLocaleDateString('en-GB')}</p>
                <p>Time: {new Date().toLocaleTimeString('en-GB')}</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {/* {summary && summary.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {summary.map((item, idx) => (
                <Card key={idx} className="print:border print:border-gray-300">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl md:text-2xl font-bold ${item.color || 'text-foreground'}`}>
                      {item.value}
                    </div>
                    {item.subtext && (
                      <p className="text-xs text-muted-foreground mt-1">{item.subtext}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )} */}

          {/* Loading State */}
          {error ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive mb-6">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Failed to load report data</p>
                <p className="text-sm mt-0.5 opacity-80">
                  {error?.message || "An unexpected error occurred. Please try refreshing."}
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading report data...</p>
              </div>
            </div>
          ) : (
            /* Report Content */
            <div className="print:text-sm">
              {children}
            </div>
          )}

          {/* Print Footer */}
          <div className="print-only hidden print:block mt-8 pt-4 border-t text-center text-xs text-gray-500">
            <p>This is a computer-generated report from KI Fashion CRM System</p>
            <p>Page <span className="print-page-number"></span></p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Hide non-printable elements */
          .no-print {
            display: none !important;
          }
          
          /* Show print-only elements */
          .print-only {
            display: block !important;
          }
          
          /* Page setup */
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          
          /* Body styles */
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          /* Card styles for print */
          .print\\:border {
            border: 1px solid #d1d5db !important;
          }
          
          /* Table styles */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 4px 8px;
            text-align: left;
          }
          
          th {
            background-color: #f3f4f6 !important;
            font-weight: 600;
          }
          
          /* Prevent page breaks inside rows */
          tr {
            page-break-inside: avoid;
          }
          
          /* Summary cards in print */
          .grid {
            display: grid !important;
          }
        }
      `}</style>
    </div>
  )
}
