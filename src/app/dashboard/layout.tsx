"use client"

import { BottomNav } from "@/components/mobile/bottom-nav"
import { Header } from "@/components/layout/header"
import { MiniSidebar } from "@/components/layout/mini-sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
            {/* Global Header */}
            <Header />

            <div className="flex-1 flex overflow-hidden relative">
                {/* Global Mini Sidebar (Navigation Rail) */}
                <div className="flex-none hidden md:block">
                    <MiniSidebar />
                </div>

                {/* Main Content Area (Includes Left Sidebar, Center Pane, Right Sidebar) */}
                <main className="flex-1 overflow-hidden relative pb-16 md:pb-0 flex">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
