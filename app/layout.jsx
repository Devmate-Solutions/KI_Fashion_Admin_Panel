import "./globals.css"
import QueryProvider from "../lib/providers/QueryProvider"
import { AuthProvider } from '@/lib/providers/AuthProvider';
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata = {
  title: "KL Fashion CRM",
  description: "Customer Relationship Management System",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" className={`${poppins.variable} antialiased h-full overflow-hidden`} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground h-full overflow-hidden" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>

            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
