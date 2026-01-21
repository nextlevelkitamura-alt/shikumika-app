"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Database } from "@/types/database"
import TaskList from "./task-list"
import MindMapViewer from "./mind-map-viewer"

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

export function CenterPane({
    project,
    groups,
    tasks,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
}: CenterPaneProps) {
    // Split pane state
    const [splitPosition, setSplitPosition] = useState(40) // 40% for TaskList
    const isDraggingRef = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Focused task ID for highlighting in map
    const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)

    // Handle split pane resize
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isDraggingRef.current = true
        e.preventDefault()
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }, [])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current || !containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const newPosition = ((e.clientX - rect.left) / rect.width) * 100
            setSplitPosition(Math.max(20, Math.min(80, newPosition)))
        }

        const handleMouseUp = () => {
            isDraggingRef.current = false
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [])

    // Task handlers for TaskList
    const handleCreateTask = useCallback(async (groupId: string, title: string, parentTaskId: string | null) => {
        if (onCreateTask) {
            return await onCreateTask(groupId, title, parentTaskId)
        }
        return null
    }, [onCreateTask])

    const handleUpdateTask = useCallback(async (taskId: string, title: string) => {
        if (onUpdateTask) {
            await onUpdateTask(taskId, { title })
        }
    }, [onUpdateTask])

    const handleDeleteTask = useCallback(async (taskId: string) => {
        if (onDeleteTask) {
            await onDeleteTask(taskId)
        }
    }, [onDeleteTask])

    const handleTaskFocus = useCallback((taskId: string) => {
        setFocusedTaskId(taskId)
    }, [])

    const handleMapTaskClick = useCallback((taskId: string) => {
        setFocusedTaskId(taskId)
        // Optionally scroll TaskList to this item
    }, [])

    if (!project) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                プロジェクトを選択してください
            </div>
        )
    }

    return (
        <div ref={containerRef} className="flex-1 flex h-full overflow-hidden">
            {/* Left: TaskList (Outliner) */}
            <div
                className="h-full overflow-hidden border-r"
                style={{ width: `${splitPosition}%` }}
            >
                <TaskList
                    tasks={tasks}
                    groups={groups}
                    projectId={project.id}
                    onCreateTask={handleCreateTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onTaskFocus={handleTaskFocus}
                />
            </div>

            {/* Resize Handle */}
            <div
                className="w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors"
                onMouseDown={handleMouseDown}
            />

            {/* Right: MindMapViewer (Read-Only) */}
            <div
                className="h-full overflow-hidden"
                style={{ width: `${100 - splitPosition}%` }}
            >
                <MindMapViewer
                    project={project}
                    groups={groups}
                    tasks={tasks}
                    onTaskClick={handleMapTaskClick}
                />
            </div>
        </div>
    )
}
