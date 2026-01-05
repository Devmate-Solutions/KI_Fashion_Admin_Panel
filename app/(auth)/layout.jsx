import QueryProvider from "../../lib/providers/QueryProvider"
import { Toaster } from "react-hot-toast"


export default function RootLayout({ children }) {
    return (

        <main className="flex-1 min-w-0">
            <QueryProvider>
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#363636',
                            color: '#fff',
                        },
                        success: {
                            duration: 3000,
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            duration: 4000,
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />
            </QueryProvider>
        </main>
    )
}
