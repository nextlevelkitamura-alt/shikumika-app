"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database } from "@/types/database"
import { ScrollArea } from "@/components/ui/scroll-area" // Assuming this exists or I'll use standard overflow-auto

type Project = Database["public"]["Tables"]["projects"]["Row"]

interface LeftSidebarProps {
    projects: Project[]
}

export function LeftSidebar({ projects }: LeftSidebarProps) {
    return (
        <div className="h-full flex flex-col bg-muted/10 border-r">
            <div className="p-4 border-b">
                {/* Goal Switcher Placeholder */}
                <div className="h-10 flex items-center justify-between bg-card border rounded-md px-3 shadow-sm cursor-pointer hover:bg-accent/50">
                    <span className="font-semibold text-sm truncate">月収100万円</span>
                    <span className="text-xs text-muted-foreground">▼</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">Projects</h3>
                {projects.map((project) => (
                    <Card key={project.id} className="cursor-pointer hover:border-primary transition-colors cursor-pointer">
                        {/* Keep-style: Purpose at top if exists */}
                        {project.purpose && (
                            <div className="bg-primary/10 text-primary text-[10px] px-3 py-1 border-b rounded-t-lg truncate">
                                {project.purpose}
                            </div>
                        )}
                        <CardHeader className="p-3 pb-2 space-y-0">
                            <div className="flex justify-between items-start gap-2">
                                <CardTitle className="text-sm font-bold leading-tight">{project.title}</CardTitle>
                                {/* Priority Dot */}
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(project.priority)}`} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className="flex items-center gap-2 mt-2">
                                {project.category_tag && <Badge variant="secondary" className="text-[10px] h-5">{project.category_tag}</Badge>}
                                <span className="text-[10px] text-muted-foreground ml-auto">{project.status}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {projects.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-8">
                        No Projects
                    </div>
                )}
            </div>
        </div>
    )
}

function getPriorityColor(priority: number) {
    // 1: Low, 5: High
    switch (priority) {
        case 5: return "bg-red-500"
        case 4: return "bg-orange-500"
        case 3: return "bg-yellow-500"
        case 2: return "bg-green-500"
        default: return "bg-gray-500"
    }
}
