import "./globals.css"
import QueryProvider from "../lib/providers/QueryProvider"
import { AuthProvider } from '@/lib/providers/AuthProvider';

export const metadata = {
  title: "KL Fashion CRM",
  description: "Customer Relationship Management System",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" className="antialiased" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>

            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
