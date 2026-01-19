"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Separator } from "@/components/ui/separator"
import { Database } from "@/types/database"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Play, Check, ChevronRight, ChevronDown, GripHorizontal } from "lucide-react"
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
    onCreateGroup?: (title: string) => void
    onDeleteGroup?: (groupId: string) => void

    onCreateTask?: (groupId: string, title?: string) => Promise<Task | null>
    onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>
    onDeleteTask?: (taskId: string) => Promise<void>
    onMoveTask?: (taskId: string, newGroupId: string) => Promise<void>
}

// Custom Progress Bar Component
function MiniProgress({ value, total }: { value: number, total: number }) {
    const percentage = total === 0 ? 0 : Math.round((value / total) * 100)
    return (
        <div className="flex items-center gap-2 min-w-[100px]">
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/70 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{value}/{total} 完了</span>
        </div>
    )
}

export function CenterPane({
    project,
    groups,
    tasks,
    onUpdateGroupTitle,
    onCreateGroup,
    onDeleteGroup,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
    onMoveTask
}: CenterPaneProps) {
    // Splitter State
    const [topHeight, setTopHeight] = useState(50) // percentage
    const containerRef = useRef<HTMLDivElement>(null)
    const isDraggingRef = useRef(false)

    // Group Collapse State
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
    }

    // Handlers needed for MindMap (even if read-only for now) or TaskList
    const handleAddTask = async (groupId: string) => {
        if (onCreateTask) await onCreateTask(groupId, "New Task")
    }

    // Splitter Logic
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isDraggingRef.current = true
        e.preventDefault()
    }, [])

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current || !containerRef.current) return
        const containerRect = containerRef.current.getBoundingClientRect()
        const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100
        // Constrain between 20% and 80%
        if (newHeight >= 20 && newHeight <= 80) setTopHeight(newHeight)
    }, [])

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false
    }, [])

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [handleMouseMove, handleMouseUp])


    if (!project) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground bg-background">
                Select a project to view details
            </div>
        )
    }

    return (
        <div ref={containerRef} className="h-full flex flex-col bg-background overflow-hidden relative">
            {/* Mind Map Area (Top) */}
            <div style={{ height: `${topHeight}%` }} className="min-h-[100px] border-b bg-muted/5 relative overflow-hidden group flex flex-col transition-none">
                <MindMap
                    project={project}
                    groups={groups}
                    tasks={tasks}
                    onUpdateGroupTitle={onUpdateGroupTitle || (() => { })}
                    onCreateGroup={onCreateGroup}
                    onDeleteGroup={onDeleteGroup}
                    onCreateTask={onCreateTask}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onMoveTask={onMoveTask}
                />
            </div>

            {/* Splitter Handle */}
            <div
                className="h-2 bg-background border-b hover:bg-primary/10 cursor-row-resize flex items-center justify-center z-10 -mt-1"
                onMouseDown={handleMouseDown}
            >
                <div className="w-8 h-1 bg-muted-foreground/20 rounded-full" />
            </div>

            {/* Task List (Bottom) */}
            <div className="flex-1 min-h-0 bg-background flex flex-col">
                <div className="px-4 py-2 border-b flex justify-between items-center bg-card">
                    <h2 className="font-semibold text-sm">タスク</h2>
                    <Button variant="ghost" size="sm" className="h-6 w-6">
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>

                <ScrollArea className="flex-1 p-2">
                    <div className="space-y-4 pb-20">
                        {groups.map((group) => {
                            const groupTasks = tasks.filter(t => t.group_id === group.id).sort((a, b) => a.priority - b.priority)
                            const completedCount = groupTasks.filter(t => t.status === 'done').length
                            const isCollapsed = collapsedGroups[group.id]

                            return (
                                <div key={group.id} className="rounded-lg border bg-card overflow-hidden">
                                    {/* Group Header (Parent Task style) */}
                                    <div
                                        className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => toggleGroup(group.id)}
                                    >
                                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-muted-foreground">
                                            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm truncate">{group.title}</span>
                                                <div className="flex items-center gap-4">
                                                    <MiniProgress value={completedCount} total={groupTasks.length} />
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tasks (Children) */}
                                    {!isCollapsed && (
                                        <div className="border-t divide-y">
                                            {groupTasks.map((task) => (
                                                <div key={task.id} className="group flex items-center gap-3 p-2 pl-10 hover:bg-muted/10 transition-colors">
                                                    {/* Checkbox */}
                                                    <button
                                                        className={cn(
                                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                            task.status === 'done' ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary"
                                                        )}
                                                        onClick={() => onUpdateTask?.(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
                                                    >
                                                        {task.status === 'done' && <Check className="w-3.5 h-3.5" />}
                                                    </button>

                                                    {/* Title */}
                                                    <input
                                                        className={cn(
                                                            "flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 px-0",
                                                            task.status === 'done' && "text-muted-foreground line-through"
                                                        )}
                                                        defaultValue={task.title}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== task.title) {
                                                                onUpdateTask?.(task.id, { title: e.target.value })
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur()
                                                                handleAddTask(group.id)
                                                            }
                                                        }}
                                                    />

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground">
                                                            <Play className="w-3 h-3" />
                                                            フォーカス (タイマー起動)
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onDeleteTask?.(task.id)}>
                                                            <MoreHorizontal className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Add Task Button */}
                                            <div className="p-2 pl-10">
                                                <button
                                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                                    onClick={() => handleAddTask(group.id)}
                                                >
                                                    <div className="w-4 h-4 flex items-center justify-center border border-dashed rounded mr-2">+</div>
                                                    新しいタスクを追加...
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        <div className="pt-4">
                            <Button variant="outline" className="w-full border-dashed text-muted-foreground" onClick={() => onCreateGroup?.("New Group")}>
                                + 新しいグループを追加
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}
