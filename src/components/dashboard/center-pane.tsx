"use client"

import { Database } from "@/types/database"
import { Separator } from "@/components/ui/separator"

type TaskGroup = Database["public"]["Tables"]["task_groups"]["Row"]
type Task = Database["public"]["Tables"]["tasks"]["Row"]

interface CenterPaneProps {
    groups: (TaskGroup & { tasks: Task[] })[]
}

export function CenterPane({ groups }: CenterPaneProps) {
    return (
        <div className="h-full flex flex-col bg-background">
            {/* Mind Map Area (Top) */}
            <div className="h-1/2 min-h-[300px] border-b bg-muted/5 relative overflow-hidden group">
                <div className="absolute top-2 left-2 z-10">
                    <span className="text-xs font-semibold px-2 py-1 bg-background/50 rounded border backdrop-blur">Mind Map</span>
                </div>
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 font-mono text-sm">
                    Mind Map Canvas Framework
                </div>
                {/* Placeholder for toolbar */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded bg-background border shadow-sm" />
                    <div className="w-8 h-8 rounded bg-background border shadow-sm" />
                </div>
            </div>

            {/* Task Group List Area (Bottom) */}
            <div className="flex-1 overflow-auto bg-card">
                <div className="p-4 space-y-6">
                    {groups.map((group) => (
                        <div key={group.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">▼</span>
                                <h3 className={`font-semibold text-sm ${getGroupColor(group.order_index)}`}>
                                    {group.title} <span className="text-muted-foreground text-xs font-normal">(Group)</span>
                                </h3>
                                <Separator className="flex-1" />
                            </div>

                            <div className="pl-6 space-y-1">
                                {group.tasks.map((task) => (
                                    <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded group">
                                        <div className="w-4 h-4 border rounded cursor-pointer" />
                                        <span className={task.status === 'done' ? 'text-muted-foreground line-through' : 'text-sm'}>
                                            {task.title}
                                        </span>
                                        {/* Metadata (Priority/Estimate) */}
                                        <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {task.estimated_time > 0 && (
                                                <span className="text-[10px] text-muted-foreground">{task.estimated_time}m</span>
                                            )}
                                            {/* Progress/Priority Bar */}
                                            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{ width: `${(task.priority / 5) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="py-1 px-2 text-xs text-muted-foreground opacity-50 hover:opacity-100 cursor-pointer">
                                    + Add Task
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function getGroupColor(index: number) {
    const colors = ["text-blue-500", "text-yellow-500", "text-red-500", "text-green-500", "text-purple-500"]
    return colors[index % colors.length]
}
