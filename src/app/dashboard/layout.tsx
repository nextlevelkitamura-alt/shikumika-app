"use client"

import { BottomNav } from "@/components/mobile/bottom-nav"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LayoutDashboard, LogOut } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
        router.push("/login")
    }

    const Sidebar = () => (
        <div className="flex flex-col h-full bg-muted/40 border-r">
            <div className="h-14 flex items-center px-4 border-b">
                <span className="font-semibold text-lg">Shikumika</span>
            </div>
            <div className="flex-1 py-4">
                {/* Placeholder for Left Sidebar Content (Goal Switcher etc) */}
                <div className="px-4 text-sm text-muted-foreground">
                    Go to <Link href="/dashboard" className="underline">Dashboard</Link>
                </div>
            </div>
            <div className="p-4 border-t">
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col h-screen overflow-hidden md:flex-row">
            {/* Mobile Header */}
            <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 md:hidden flex-none">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle navigation</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col p-0 w-[220px]">
                        <Sidebar />
                    </SheetContent>
                </Sheet>
                <span className="font-semibold">Shikumika</span>
            </header>

            {/* Desktop Wrapper - The 'children' here will be the DashboardPage which contains the 3-pane grid */}
            <main className="flex-1 overflow-hidden relative pb-16 md:pb-0">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
