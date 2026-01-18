import { Separator } from "@/components/ui/separator"
import { Database } from "@/types/database"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Play, CheckCircle2, Circle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { MindMap } from "./mind-map"

type Project = Database['public']['Tables']['projects']['Row']
type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

interface CenterPaneProps {
    project?: Project
    groups: TaskGroup[]
    tasks: Task[]
    onUpdateGroupTitle?: (groupId: string, newTitle: string) => void
}

export function CenterPane({ project, groups, tasks, onUpdateGroupTitle }: CenterPaneProps) {

    const getGroupColor = (index: number) => {
        const colors = ["text-blue-500", "text-purple-500", "text-pink-500", "text-indigo-500"]
        return colors[index % colors.length]
    }

    // Group tasks by group_id
    const getTasksForGroup = (groupId: string) => {
        return tasks.filter(t => t.group_id === groupId).sort((a, b) => (a.priority - b.priority) * -1) // High priority first
    }

    if (!project) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a project to view details
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Mind Map Area (Top) */}
            <div className="h-1/2 min-h-[300px] border-b bg-muted/5 relative overflow-hidden group flex flex-col">
                <div className="absolute top-2 left-2 z-10 bg-background/80 p-1 text-[10px] text-muted-foreground rounded border">
                    Mind Map Active v3
                    {project ? ` - Project: ${project.title}` : ' - No Project'}
                </div>
                <MindMap
                    project={project}
                    groups={groups}
                    onUpdateGroupTitle={onUpdateGroupTitle || (() => { })}
                />
            </div>

            {/* Task Group List Area (Bottom) */}
            <ScrollArea className="flex-1 bg-card">
                <div className="p-4 space-y-8 pb-20">
                    {groups.map((group, index) => {
                        const groupTasks = getTasksForGroup(group.id)
                        return (
                            <div key={group.id} className="space-y-3">
                                {/* Group Header */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">▼</span>
                                    <h3 className={cn("font-semibold text-sm", getGroupColor(group.order_index || index))}>
                                        {group.title}
                                    </h3>
                                    <Separator className="flex-1" />
                                </div>

                                {/* Task List */}
                                <div className="space-y-1 pl-2">
                                    {groupTasks.map(task => (
                                        <div key={task.id} className="group/task flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                            {/* Checkbox / Status */}
                                            <button className="text-muted-foreground hover:text-primary transition-colors">
                                                {task.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4" />}
                                            </button>

                                            {/* Title */}
                                            <span className={cn("flex-1 text-sm truncate", task.status === 'done' && "line-through text-muted-foreground")}>
                                                {task.title}
                                            </span>

                                            {/* Meta (Time) */}
                                            {task.estimated_time > 0 && (
                                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {task.estimated_time}m
                                                </span>
                                            )}

                                            {/* Actions (Hover only) */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-orange-500" title="Start Focus Timer">
                                                    <Play className="w-3 h-3" />
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                            <MoreHorizontal className="w-3 h-3" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem>Add Subtask</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                    {groupTasks.length === 0 && (
                                        <div className="text-xs text-muted-foreground pl-8 py-2 italic">
                                            No tasks
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {groups.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                            No task groups defined.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
