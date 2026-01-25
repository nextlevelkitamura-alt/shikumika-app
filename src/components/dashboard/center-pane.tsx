"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { Database } from "@/types/database"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Play, Check, ChevronRight, ChevronDown, Plus, Trash2, Pause, RotateCcw, Timer, GripVertical, Calendar as CalendarIcon, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { MindMap } from "./mind-map"
import { useTimer, formatTime } from "@/contexts/TimerContext"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { PriorityBadge, PriorityPopover, Priority, getPriorityIconColor } from "@/components/ui/priority-select"

// DateTimePicker を dynamic import（SSR を完全に無効化）
const DateTimePicker = dynamic(
    () => import("@/components/ui/date-time-picker").then((mod) => ({ default: mod.DateTimePicker })),
    {
        ssr: false,
        loading: () => <div className="w-6 h-6 animate-spin border-2 border-zinc-600 border-t-transparent rounded-full" />,
    }
)

type Project = Database['public']['Tables']['projects']['Row']
type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

interface CenterPaneProps {
    project?: Project
    groups: TaskGroup[]
    tasks: Task[]
    onUpdateGroupTitle?: (groupId: string, newTitle: string) => void
    onUpdateGroup?: (groupId: string, updates: Partial<TaskGroup>) => Promise<void>
    onUpdateProject?: (projectId: string, title: string) => Promise<void>
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
    groupId,
    dragHandleProps
}: {
    task: Task
    allTasks: Task[]
    depth?: number
    onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>
    onDeleteTask?: (taskId: string) => Promise<void>
    onCreateTask?: (groupId: string, title?: string, parentTaskId?: string | null) => Promise<Task | null>
    groupId: string
    dragHandleProps?: any
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
                style={{ paddingLeft: `calc(${depth * 1.5}rem + 0.5rem)` }}
            >
                {/* Drag Handle */}
                {depth === 0 && dragHandleProps && (
                    <div
                        {...dragHandleProps}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                )}

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

                {/* Timer & Date Controls */}
                <div className="flex items-center gap-3">
                    {/* Group 1: Timer Info */}
                    <div className="flex items-center gap-2">
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

                        {/* Focus Button */}
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
                            /* Stopped State: Play button */
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-6 text-[10px] gap-1",
                                    runningTaskId && runningTaskId !== task.id
                                        ? "border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                                        : "hover:bg-primary hover:text-primary-foreground"
                                )}
                                onClick={() => startTimer(task)}
                                disabled={isLoading || task.status === 'done'}
                                title={runningTaskId && runningTaskId !== task.id ? "別タスクで計測中（切替可能）" : "タイマー開始"}
                            >
                                <Play className="w-2.5 h-2.5" />
                                {runningTaskId && runningTaskId !== task.id ? "切替" : "フォーカス"}
                            </Button>
                        )}
                    </div>

                    {/* Group 2: Priority */}
                    <div className="flex items-center gap-1">
                        {task.priority ? (
                            <>
                                {/* Priority Badge (clickable) */}
                                <PriorityPopover
                                    value={task.priority as Priority}
                                    onChange={(priority) => onUpdateTask?.(task.id, { priority })}
                                    trigger={
                                        <span className="cursor-pointer">
                                            <PriorityBadge value={task.priority as Priority} />
                                        </span>
                                    }
                                />
                                
                                {/* Clear Button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 text-zinc-500 hover:text-red-400 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onUpdateTask?.(task.id, { priority: undefined as any })
                                    }}
                                    title="優先度を削除"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </>
                        ) : (
                            /* Priority not set: Icon only (gray) */
                            <PriorityPopover
                                value={3}
                                onChange={(priority) => onUpdateTask?.(task.id, { priority })}
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-zinc-500 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                                        title="優先度を設定"
                                    >
                                        🎯
                                    </Button>
                                }
                            />
                        )}
                    </div>

                    {/* Group 3: Date Info */}
                    <div className="flex items-center gap-1">
                        <DateTimePicker
                            date={task.scheduled_at ? new Date(task.scheduled_at) : undefined}
                            setDate={(date) => onUpdateTask?.(task.id, { scheduled_at: date ? date.toISOString() : null })}
                            trigger={
                                task.scheduled_at ? (
                                    <div className="flex items-center gap-1">
                                        {/* Date Text (clickable) */}
                                        <span className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
                                            {new Date(task.scheduled_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        
                                        {/* Clear Button */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 text-zinc-500 hover:text-red-400 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onUpdateTask?.(task.id, { scheduled_at: null })
                                            }}
                                            title="日時設定を削除"
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    /* Date not set: Calendar icon only */
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-zinc-500 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                                        title="日時設定"
                                    >
                                        <CalendarIcon className="w-4 h-4" />
                                    </Button>
                                )
                            }
                        />
                    </div>

                    {/* Group 4: Other Actions (Hover) */}
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
    onUpdateGroup,
    onUpdateProject,
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

    // Drag & Drop handler
    const handleDragEnd = useCallback(async (result: DropResult) => {
        if (!result.destination || !onUpdateTask) return;

        const { source, destination, draggableId } = result;

        // Same position - no change
        if (source.index === destination.index && source.droppableId === destination.droppableId) return;

        const groupId = destination.droppableId;
        const groupTasks = tasks
            .filter(t => t.group_id === groupId && !t.parent_task_id)
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

        // Calculate new order_index
        let newOrderIndex: number;
        const destIndex = destination.index;

        // Remove dragged item from list for calculation
        const filteredTasks = groupTasks.filter(t => t.id !== draggableId);

        if (destIndex === 0) {
            // First position
            const firstTask = filteredTasks[0];
            newOrderIndex = firstTask ? (firstTask.order_index ?? 0) - 1 : 0;
        } else if (destIndex >= filteredTasks.length) {
            // Last position
            const lastTask = filteredTasks[filteredTasks.length - 1];
            newOrderIndex = lastTask ? (lastTask.order_index ?? 0) + 1 : destIndex;
        } else {
            // Middle - calculate midpoint
            const prevTask = filteredTasks[destIndex - 1];
            const nextTask = filteredTasks[destIndex];
            const prevIndex = prevTask?.order_index ?? 0;
            const nextIndex = nextTask?.order_index ?? prevIndex + 2;
            newOrderIndex = Math.floor((prevIndex + nextIndex) / 2);

            // If integers collide, reindex all tasks
            if (newOrderIndex === prevIndex || newOrderIndex === nextIndex) {
                newOrderIndex = prevIndex + 1;
            }
        }

        await onUpdateTask(draggableId, { order_index: newOrderIndex });
    }, [tasks, onUpdateTask]);

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
                    onUpdateProject={onUpdateProject}
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

                <DragDropContext onDragEnd={handleDragEnd}>
                    <ScrollArea className="flex-1 h-full overflow-y-auto">
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

                                // Auto-complete logic: Check if all tasks are completed
                                const isGroupCompleted = allGroupTasks.length > 0 && allGroupTasks.every(t => t.status === 'done')
                                
                                // Calculate total elapsed time for all tasks in group
                                const totalElapsedSeconds = allGroupTasks.reduce((acc, t) => acc + (t.total_elapsed_seconds ?? 0), 0)

                                // Handle group checkbox toggle
                                const handleGroupCheckToggle = async () => {
                                    const newStatus = isGroupCompleted ? 'todo' : 'done'
                                    // Update all tasks in group
                                    for (const task of allGroupTasks) {
                                        await onUpdateTask?.(task.id, { status: newStatus })
                                    }
                                }

                                return (
                                    <div key={group.id} className="rounded-lg border bg-card overflow-hidden">
                                        {/* Group Header */}
                                        <div className="group flex items-center gap-2 p-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                                            {/* Checkbox (Auto-complete) */}
                                            <button
                                                className={cn(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                                                    isGroupCompleted ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary"
                                                )}
                                                onClick={handleGroupCheckToggle}
                                                title={isGroupCompleted ? "グループを未完了に戻す" : "グループを完了"}
                                            >
                                                {isGroupCompleted && <Check className="w-3.5 h-3.5" />}
                                            </button>

                                            {/* Collapse/Expand Button */}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-5 w-5 shrink-0 text-muted-foreground"
                                                onClick={() => toggleGroup(group.id)}
                                            >
                                                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>

                                            {/* Group Title */}
                                            <input
                                                className="font-medium text-sm bg-transparent border-none focus:outline-none focus:ring-0 px-1 min-w-0 flex-1"
                                                defaultValue={group.title}
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

                                            {/* Total Elapsed Time */}
                                            {totalElapsedSeconds > 0 && (
                                                <span className="text-xs font-mono tabular-nums text-muted-foreground px-1.5 py-0.5 rounded">
                                                    <Timer className="inline w-3 h-3 mr-1" />
                                                    {formatTime(totalElapsedSeconds)}
                                                </span>
                                            )}

                                            {/* Progress */}
                                            <MiniProgress value={completedCount} total={allGroupTasks.length} />

                                            {/* Group Controls */}
                                            <div className="flex items-center gap-3">
                                                {/* Priority */}
                                                <div className="flex items-center gap-1">
                                                    {(group as any).priority ? (
                                                        <>
                                                            <PriorityPopover
                                                                value={(group as any).priority as Priority}
                                                                onChange={(priority) => onUpdateGroup?.(group.id, { priority } as any)}
                                                                trigger={
                                                                    <span className="cursor-pointer">
                                                                        <PriorityBadge value={(group as any).priority as Priority} />
                                                                    </span>
                                                                }
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-4 w-4 text-zinc-500 hover:text-red-400 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    onUpdateGroup?.(group.id, { priority: undefined } as any)
                                                                }}
                                                                title="優先度を削除"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <PriorityPopover
                                                            value={3}
                                                            onChange={(priority) => onUpdateGroup?.(group.id, { priority } as any)}
                                                            trigger={
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-zinc-500 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                                                                    title="優先度を設定"
                                                                >
                                                                    🎯
                                                                </Button>
                                                            }
                                                        />
                                                    )}
                                                </div>

                                                {/* Date */}
                                                <div className="flex items-center gap-1">
                                                    <DateTimePicker
                                                        date={(group as any).scheduled_at ? new Date((group as any).scheduled_at) : undefined}
                                                        setDate={(date) => onUpdateGroup?.(group.id, { scheduled_at: date ? date.toISOString() : null } as any)}
                                                        trigger={
                                                            (group as any).scheduled_at ? (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
                                                                        {new Date((group as any).scheduled_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-4 w-4 text-zinc-500 hover:text-red-400 transition-colors"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            onUpdateGroup?.(group.id, { scheduled_at: null } as any)
                                                                        }}
                                                                        title="日時設定を削除"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-zinc-500 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                                                                    title="日時設定"
                                                                >
                                                                    <CalendarIcon className="w-4 h-4" />
                                                                </Button>
                                                            )
                                                        }
                                                    />
                                                </div>

                                                {/* Add Task Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-[10px] gap-1 opacity-0 group-hover:opacity-100"
                                                    onClick={() => handleAddTask(group.id)}
                                                    title="タスク追加"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    追加
                                                </Button>

                                                {/* Delete Group Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                                                    onClick={() => onDeleteGroup?.(group.id)}
                                                    title="グループ削除"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Tasks */}
                                        {!isCollapsed && (
                                            <Droppable droppableId={group.id}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className="border-t divide-y"
                                                    >
                                                        {parentTasks.map((task, index) => (
                                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        className={cn(
                                                                            snapshot.isDragging && "bg-muted/50 shadow-lg rounded"
                                                                        )}
                                                                    >
                                                                        <TaskItem
                                                                            task={task}
                                                                            allTasks={allGroupTasks}
                                                                            onUpdateTask={onUpdateTask}
                                                                            onDeleteTask={onDeleteTask}
                                                                            onCreateTask={onCreateTask}
                                                                            groupId={group.id}
                                                                            dragHandleProps={provided.dragHandleProps}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}

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
                                            </Droppable>
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
                </DragDropContext>
            </div>
        </div>
    )
}
