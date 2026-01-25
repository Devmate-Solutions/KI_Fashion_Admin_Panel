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
                <main className="flex-1 min-w-0 overflow-y-auto scroll-smooth overflow-x-hidden">
                    <div className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                    <Toaster
                        position="top-center"
                        containerStyle={{
                            top: '80px',
                        }}
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: '#363636',
                                color: '#fff',
                                fontFamily: 'var(--font-poppins)',
                                fontSize: '14px',
                                padding: '12px 16px',
                                maxWidth: 'calc(100vw - 2rem)',
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
