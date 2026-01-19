"use client"

import { BottomNav } from "@/components/mobile/bottom-nav"
import { Header } from "@/components/layout/header"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {

    // Header is now global at the top
    // Left sidebar is handled inside the page/client component as per the 3-pane layout
    // Mobile nav remains at bottom

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
            {/* Global Header */}
            <Header />

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative pb-16 md:pb-0">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
