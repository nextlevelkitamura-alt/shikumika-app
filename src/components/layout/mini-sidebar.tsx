"use client"

import { Button } from "@/components/ui/button"
import { LayoutDashboard, Briefcase, FileText, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface MiniSidebarProps {
    className?: string
}

export function MiniSidebar({ className }: MiniSidebarProps) {
    const [activeTab, setActiveTab] = useState("dashboard")

    const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => {
        const isActive = activeTab === id
        return (
            <div className="relative group flex items-center justify-center w-full py-3">
                {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                )}
                <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon"
                    className={cn(
                        "h-10 w-10 rounded-xl transition-all",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={() => setActiveTab(id)}
                    title={label}
                >
                    <Icon className="w-5 h-5" />
                </Button>

                {/* Tooltip (Simple) */}
                <div className="absolute left-14 bg-popover text-popover-foreground text-xs px-2 py-1 rounded border shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {label}
                </div>
            </div>
        )
    }

    return (
        <div className={cn("h-full w-[60px] flex flex-col items-center bg-card border-r py-4 z-40", className)}>
            {/* Top Stats / Branding Icon Placeholder if needed */}
            <div className="mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/30">
                    <LayoutDashboard className="w-5 h-5" />
                </div>
            </div>

            <div className="flex-1 w-full space-y-2 flex flex-col items-center pt-4">
                <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem id="goals" icon={Briefcase} label="Goals & Targets" />
                <NavItem id="documents" icon={FileText} label="Documents" />
            </div>

            <div className="w-full pb-4 flex flex-col items-center border-t pt-4">
                <NavItem id="settings" icon={Settings} label="Settings" />
            </div>
        </div>
    )
}
