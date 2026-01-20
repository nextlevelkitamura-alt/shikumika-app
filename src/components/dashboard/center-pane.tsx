"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Database } from "@/types/database"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Play, Check, ChevronRight, ChevronDown, Plus, Trash2, Pause, RotateCcw, Timer } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { MindMap } from "./mind-map"
import { useTimer, formatTime } from "@/contexts/TimerContext"

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
    onCreateTask?: (groupId: string, title?: string, parentTaskId?: string | null) => Promise<Task | null>
    onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>
    onDeleteTask?: (taskId: string) => Promise<void>
    onMoveTask?: (taskId: string, newGroupId: string) => Promise<void>
}

// Progress Bar Component
function MiniProgress({ value, total }: { value: number, total: number }) {
    const percentage = total === 0 ? 0 : Math.round((value / total) * 100)
    return (
        <div className="flex items-center gap-2 min-w-[80px]">
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/70 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{value}/{total}</span>
        </div>
    )
}

// Task Item Component (Recursive for parent-child, supports up to 6 levels)
function TaskItem({
    task,
    allTasks,
    depth = 0,
    onUpdateTask,
    onDeleteTask,
    onCreateTask,
    groupId
}: {
    task: Task
    allTasks: Task[]
    depth?: number
    onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>
    onDeleteTask?: (taskId: string) => Promise<void>
    onCreateTask?: (groupId: string, title?: string, parentTaskId?: string | null) => Promise<Task | null>
    groupId: string
}) {
    const [isExpanded, setIsExpanded] = useState(true)

    // Max depth limit (6 levels)
    const MAX_DEPTH = 6;
    const canAddChildren = depth < MAX_DEPTH - 1;

    // Safety: Return null if task is invalid
    if (!task || !task.id) {
        return null;
    }

    // Safely filter allTasks to prevent undefined access
    const safeTasks = (allTasks ?? []).filter(t => t && t.id);

    // Get child tasks
    const childTasks = safeTasks.filter(t => t.parent_task_id === task.id).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    const hasChildren = childTasks.length > 0

    // Calculate progress for parent tasks
    const completedChildren = childTasks.filter(t => t.status === 'done').length

    const handleAddChildTask = async () => {
        if (onCreateTask) {
            await onCreateTask(groupId, "New Subtask", task.id)
        }
    }

    // Timer hook
    const { runningTaskId, currentElapsedSeconds, startTimer, pauseTimer, completeTimer, interruptTimer, isLoading } = useTimer();
    const isTimerRunning = runningTaskId === task.id;

    // Calculate elapsed time for this task
    const taskElapsedSeconds = isTimerRunning
        ? currentElapsedSeconds
        : (task.total_elapsed_seconds ?? 0);


    return (
        <div className="w-full">
            <div
                className="group flex items-center gap-2 p-2 hover:bg-muted/10 transition-colors"
                style={{ paddingLeft: `calc(${depth * 1.5}rem + 1rem)` }}
            >
                {/* Expand/Collapse for parent tasks */}
                {hasChildren ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0 text-muted-foreground"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                ) : (
                    <div className="w-5" />
                )}

                {/* Checkbox */}
                <button
                    className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                        task.status === 'done' ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary"
                    )}
                    onClick={() => onUpdateTask?.(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
                >
                    {task.status === 'done' && <Check className="w-3.5 h-3.5" />}
                </button>

                {/* Title */}
                <input
                    className={cn(
                        "flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 px-1 min-w-0",
                        task.status === 'done' && "text-muted-foreground line-through"
                    )}
                    defaultValue={task.title}
                    onBlur={(e) => {
                        const newValue = e.target.value;
                        if (newValue !== task.title) {
                            onUpdateTask?.(task.id, { title: newValue })
                        }
                    }}
                    onKeyDown={(e) => {
                        // Skip if IME is composing (Japanese/Chinese input)
                        if (e.nativeEvent.isComposing) return;

                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                        }
                    }}
                />

                {/* Progress Bar for parent tasks with children */}
                {hasChildren && (
                    <MiniProgress value={completedChildren} total={childTasks.length} />
                )}

                {/* Timer Controls */}
                <div className="flex items-center gap-1">
                    {/* Time Display */}
                    {(taskElapsedSeconds > 0 || isTimerRunning) && (
                        <span className={cn(
                            "text-xs font-mono tabular-nums px-1.5 py-0.5 rounded",
                            isTimerRunning ? "bg-primary/10 text-primary" : "text-muted-foreground"
                        )}>
                            <Timer className="inline w-3 h-3 mr-1" />
                            {formatTime(taskElapsedSeconds)}
                        </span>
                    )}

                    {isTimerRunning ? (
                        /* Running State: Pause / Complete / Interrupt */
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-amber-500 hover:bg-amber-500/10"
                                onClick={() => pauseTimer()}
                                disabled={isLoading}
                                title="一時停止"
                            >
                                <Pause className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-500 hover:bg-green-500/10"
                                onClick={() => completeTimer()}
                                disabled={isLoading}
                                title="完了"
                            >
                                <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:bg-muted/50"
                                onClick={() => interruptTimer()}
                                disabled={isLoading}
                                title="中断・戻る"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                        </>
                    ) : (
                        /* Stopped State: Play button (visible on hover) */
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
                            onClick={() => startTimer(task)}
                            disabled={isLoading || task.status === 'done'}
                        >
                            <Play className="w-2.5 h-2.5" />
                            フォーカス
                        </Button>
                    )}
                </div>

                {/* Actions (Hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canAddChildren && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={handleAddChildTask}
                            title="サブタスク追加"
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    )}

                    {/* Direct Delete Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteTask?.(task.id)}
                        title="削除"
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Child Tasks (Recursive) */}
            {hasChildren && isExpanded && (
                <div className="border-l border-muted" style={{ marginLeft: `calc(${depth * 1.5}rem + 1.5rem)` }}>
                    {childTasks.map(child => (
                        <TaskItem
                            key={child.id}
                            task={child}
                            allTasks={allTasks}
                            depth={depth + 1}
                            onUpdateTask={onUpdateTask}
                            onDeleteTask={onDeleteTask}
                            onCreateTask={onCreateTask}
                            groupId={groupId}
                        />
                    ))}
                </div>
            )}
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
    const [topHeight, setTopHeight] = useState(50)
    const containerRef = useRef<HTMLDivElement>(null)
    const isDraggingRef = useRef(false)

    // Group Collapse State
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
    }

    const handleAddTask = async (groupId: string) => {
        if (onCreateTask) await onCreateTask(groupId, "New Task", null)
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
                </div>

                <ScrollArea className="flex-1">
                    <div className="space-y-3 p-2 pb-20">
                        {groups.map((group) => {
                            // Get only parent tasks (no parent_task_id)
                            const parentTasks = tasks
                                .filter(t => t.group_id === group.id && !t.parent_task_id)
                                .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

                            // Get all tasks in this group for progress calculation
                            const allGroupTasks = tasks.filter(t => t.group_id === group.id)
                            const completedCount = allGroupTasks.filter(t => t.status === 'done').length
                            const isCollapsed = collapsedGroups[group.id]

                            return (
                                <div key={group.id} className="rounded-lg border bg-card overflow-hidden">
                                    {/* Group Header */}
                                    <div
                                        className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => toggleGroup(group.id)}
                                    >
                                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-muted-foreground">
                                            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <input
                                                    className="font-medium text-sm truncate bg-transparent border-none focus:outline-none focus:ring-0 px-0 min-w-0 flex-1"
                                                    defaultValue={group.title}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== group.title) {
                                                            onUpdateGroupTitle?.(group.id, e.target.value)
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.nativeEvent.isComposing) return;
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                />
                                                <div className="flex items-center gap-4">
                                                    <MiniProgress value={completedCount} total={allGroupTasks.length} />
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onSelect={(e) => {
                                                                    e.preventDefault(); // Keep dropdown open
                                                                    handleAddTask(group.id);
                                                                }}
                                                            >
                                                                <Plus className="w-3 h-3 mr-2" />
                                                                タスク追加
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => onDeleteGroup?.(group.id)}
                                                            >
                                                                <Trash2 className="w-3 h-3 mr-2" />
                                                                グループ削除
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tasks */}
                                    {!isCollapsed && (
                                        <div className="border-t divide-y">
                                            {parentTasks.map((task) => (
                                                <TaskItem
                                                    key={task.id}
                                                    task={task}
                                                    allTasks={allGroupTasks}
                                                    onUpdateTask={onUpdateTask}
                                                    onDeleteTask={onDeleteTask}
                                                    onCreateTask={onCreateTask}
                                                    groupId={group.id}
                                                />
                                            ))}

                                            {/* Add Task Button */}
                                            <button
                                                className="w-full p-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 flex items-center justify-center gap-2 transition-colors"
                                                onClick={() => handleAddTask(group.id)}
                                            >
                                                <Plus className="w-3 h-3" />
                                                タスクを追加...
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        <Button
                            variant="outline"
                            className="w-full border-dashed text-muted-foreground"
                            onClick={() => onCreateGroup?.("New Group")}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            新しいグループを追加
                        </Button>
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}
