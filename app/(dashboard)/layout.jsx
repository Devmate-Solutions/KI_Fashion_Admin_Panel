import { Toaster } from "react-hot-toast"
import TopBar from "../../components/topbar"
import Sidebar from "../../components/sidebar"
export const metadata = {
    title: "KL Fashion CRM",
    description: "Customer Relationship Management System",
}

export default function RootLayout({ children }) {
    return (
        <div className="min-h-dvh flex flex-col bg-[#fbfcfd]">
            <TopBar />
            <div className="flex min-h-0 flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 min-w-0 overflow-y-auto">
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
                </main>
            </div>
        </div>
    )
}
