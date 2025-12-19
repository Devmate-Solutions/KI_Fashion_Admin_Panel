"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import toast from "react-hot-toast"
import ExpenseForm from "@/components/forms/expense-form"

export default function NewExpensePage() {
  const router = useRouter()

  const handleSave = useCallback(async (expenseData) => {
    // TODO: This will be integrated with useCreateExpense hook later
    // For now, just log the data and navigate back
    console.log("Expense data to save:", expenseData)

    // Show success notification
    toast.success('Expense form data collected! API integration pending.', {
      duration: 4000,
      position: 'top-right',
    })

    // Navigate back to buying/expenses tab after short delay
    setTimeout(() => {
      router.push("/buying")
    }, 500)
  }, [router])

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <header className="mb-6">
        <h1 className="text-lg font-semibold">New Expense</h1>
        <p className="text-sm text-muted-foreground">Create a new expense entry with products and details.</p>
      </header>

      <ExpenseForm onSave={handleSave} />
    </div>
  )
}
