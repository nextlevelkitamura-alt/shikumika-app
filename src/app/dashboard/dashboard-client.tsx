"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { CenterPane } from "@/components/dashboard/center-pane"
import { RightSidebar } from "@/components/dashboard/right-sidebar"
import { Database } from "@/types/database"
import { useMindMapSync } from "@/hooks/useMindMapSync"
import { TimerProvider } from "@/contexts/TimerContext"
import { useUndoRedo } from "@/hooks/useUndoRedo"

type Goal = Database['public']['Tables']['goals']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

interface DashboardClientProps {
    initialGoals: Goal[]
    initialProjects: Project[]
    initialGroups: TaskGroup[]
    initialTasks: Task[]
    userId: string
}

export function DashboardClient({
    initialGoals,
    initialProjects,
    initialGroups,
    initialTasks,
    userId
}: DashboardClientProps) {
    // State
    const [goals] = useState<Goal[]>(initialGoals)
    const [projects, setProjects] = useState<Project[]>(initialProjects)

    // Selection State
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
        initialGoals.length > 0 ? initialGoals[0].id : null
    )
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
        initialProjects.length > 0 ? initialProjects[0].id : null
    )

    // STABLE reference for filtered projects using useMemo
    const filteredProjects = useMemo(() =>
        projects.filter(p => p.goal_id === selectedGoalId),
        [projects, selectedGoalId]
    )

    // Auto-select first project when goal changes (NOTE: deps are primitives only)
    useEffect(() => {
        if (selectedGoalId) {
            const projectsInGoal = projects.filter(p => p.goal_id === selectedGoalId)
            if (projectsInGoal.length > 0 && !projectsInGoal.find(p => p.id === selectedProjectId)) {
                setSelectedProjectId(projectsInGoal[0].id)
            } else if (projectsInGoal.length === 0) {
                setSelectedProjectId(null)
            }
        }
    }, [selectedGoalId]) // ONLY depends on selectedGoalId, not objects

    const selectedProject = useMemo(() =>
        projects.find(p => p.id === selectedProjectId),
        [projects, selectedProjectId]
    )

    // --- MindMap Sync Hook ---
    // STABLE reference for initial groups using useMemo with string dep
    const projectGroupsInitial = useMemo(() =>
        initialGroups.filter(g => g.project_id === selectedProjectId),
        [initialGroups, selectedProjectId]
    )

    // STABLE reference for initial tasks - useMemo
    const projectTasksInitial = useMemo(() => {
        const groupIds = new Set(projectGroupsInitial.map(g => g.id))
        return initialTasks.filter(t => groupIds.has(t.group_id))
    }, [initialTasks, projectGroupsInitial])

    // Undo/Redo state management
    interface UndoState {
        groups: TaskGroup[]
        tasks: Task[]
    }
    
    // CRITICAL: Memoize initialUndoState to prevent infinite loops
    // Only recreate when projectGroupsInitial or projectTasksInitial actually change
    const initialUndoState = useMemo<UndoState>(() => ({
        groups: projectGroupsInitial ?? [],
        tasks: projectTasksInitial ?? []
    }), [projectGroupsInitial, projectTasksInitial])

    const {
        state: undoState,
        setState: saveUndoState,
        undo,
        redo,
        canUndo,
        canRedo
    } = useUndoRedo<UndoState>(initialUndoState)

    // Use undo state or current initial state
    // Safety: ensure undoState exists and has required properties
    // CRITICAL: Remove syncKey dependency to prevent infinite loops
    const effectiveGroups = useMemo(() => {
        if (!undoState || !undoState.groups) return projectGroupsInitial ?? []
        // Use undo state if it exists, otherwise fall back to initial
        return Array.isArray(undoState.groups) ? undoState.groups : projectGroupsInitial ?? []
    }, [undoState?.groups, projectGroupsInitial])

    const effectiveTasks = useMemo(() => {
        if (!undoState || !undoState.tasks) return projectTasksInitial ?? []
        // Use undo state if it exists, otherwise fall back to initial
        return Array.isArray(undoState.tasks) ? undoState.tasks : projectTasksInitial ?? []
    }, [undoState?.tasks, projectTasksInitial])

    const {
        groups: currentGroups,
        tasks: currentTasks,
        createGroup,
        updateGroupTitle,
        deleteGroup,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        updateProjectTitle,
        isLoading
    } = useMindMapSync({
        projectId: selectedProjectId,
        userId,
        initialGroups: effectiveGroups,
        initialTasks: effectiveTasks
    })

    // Don't auto-save to history - only save before operations

    // Handle Undo/Redo
    // CRITICAL: Don't use syncKey - useMindMapSync will update automatically via initialGroups/initialTasks
    const handleUndo = useCallback(() => {
        undo()
    }, [undo])

    const handleRedo = useCallback(() => {
        redo()
    }, [redo])

    // Global keyboard handler for Command+Z / Command+Shift+Z
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Command+Z (Mac) or Ctrl+Z (Windows/Linux)
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                handleUndo()
            }
            // Command+Shift+Z (Mac) or Ctrl+Y (Windows/Linux) for Redo
            if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
                e.preventDefault()
                handleRedo()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleUndo, handleRedo])

    // STABLE handlers using useCallback (with undo state saving)
    const handleCreateGroup = useCallback(async (title: string) => {
        // Save state before operation
        saveUndoState({ groups: currentGroups ?? [], tasks: currentTasks ?? [] }, false)
        await createGroup(title)
    }, [createGroup, currentGroups, currentTasks, saveUndoState])

    const handleUpdateProjectTitle = useCallback(async (projectId: string, newTitle: string) => {
        // Optimistic update local state
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, title: newTitle } : p))

        // Persist to DB
        if (updateProjectTitle) {
            await updateProjectTitle(projectId, newTitle)
        }
    }, [updateProjectTitle])

    const handleUpdateGroupTitle = useCallback(async (groupId: string, newTitle: string) => {
        // Save state before operation
        saveUndoState({ groups: currentGroups ?? [], tasks: currentTasks ?? [] }, false)
        await updateGroupTitle(groupId, newTitle)
    }, [updateGroupTitle, currentGroups, currentTasks, saveUndoState])

    const handleDeleteGroup = useCallback(async (groupId: string) => {
        // Save state before operation
        saveUndoState({ groups: currentGroups ?? [], tasks: currentTasks ?? [] }, false)
        await deleteGroup(groupId)
    }, [deleteGroup, currentGroups, currentTasks, saveUndoState])

    // Wrap task operations with undo state saving
    const handleCreateTask = useCallback(async (groupId: string, title?: string, parentTaskId?: string | null) => {
        // Save state before operation
        saveUndoState({ groups: currentGroups ?? [], tasks: currentTasks ?? [] }, false)
        return await createTask(groupId, title, parentTaskId)
    }, [createTask, currentGroups, currentTasks, saveUndoState])

    const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        // Save state before operation
        saveUndoState({ groups: currentGroups ?? [], tasks: currentTasks ?? [] }, false)
        await updateTask(taskId, updates)
    }, [updateTask, currentGroups, currentTasks, saveUndoState])

    const handleDeleteTask = useCallback(async (taskId: string) => {
        // Save state before operation
        saveUndoState({ groups: currentGroups ?? [], tasks: currentTasks ?? [] }, false)
        await deleteTask(taskId)
    }, [deleteTask, currentGroups, currentTasks, saveUndoState])

    const handleMoveTask = useCallback(async (taskId: string, newGroupId: string) => {
        // Save state before operation
        saveUndoState({ groups: currentGroups ?? [], tasks: currentTasks ?? [] }, false)
        await moveTask(taskId, newGroupId)
    }, [moveTask, currentGroups, currentTasks, saveUndoState])

    // Resizable Sidebar State
    const [leftSidebarWidth, setLeftSidebarWidth] = useState(280)
    const [rightSidebarWidth, setRightSidebarWidth] = useState(300)
    const isDraggingLeftRef = useRef(false)
    const isDraggingRightRef = useRef(false)

    // Handle sidebar resize
    const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
        isDraggingLeftRef.current = true
        e.preventDefault()
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'col-resize'
    }, [])

    const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
        isDraggingRightRef.current = true
        e.preventDefault()
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'col-resize'
    }, [])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingLeftRef.current) {
                const newWidth = Math.max(200, Math.min(450, e.clientX))
                setLeftSidebarWidth(newWidth)
            }
            if (isDraggingRightRef.current) {
                const newWidth = Math.max(200, Math.min(500, window.innerWidth - e.clientX))
                setRightSidebarWidth(newWidth)
            }
        }

        const handleMouseUp = () => {
            isDraggingLeftRef.current = false
            isDraggingRightRef.current = false
            document.body.style.userSelect = ''
            document.body.style.cursor = ''
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [])

    return (
        <TimerProvider tasks={currentTasks} onUpdateTask={updateTask}>
            <div className="flex h-full w-full">
                {/* Pane 1: Left Sidebar */}
                <div
                    className="hidden md:flex flex-none overflow-hidden h-full"
                    style={{ width: leftSidebarWidth }}
                >
                    <LeftSidebar
                        goals={goals}
                        selectedGoalId={selectedGoalId}
                        onSelectGoal={setSelectedGoalId}
                        projects={filteredProjects}
                        selectedProjectId={selectedProjectId}
                        onSelectProject={setSelectedProjectId}
                    />
                </div>

                {/* Left Resize Handle */}
                <div
                    className="hidden md:flex w-1 h-full bg-border hover:bg-primary/50 cursor-col-resize transition-colors flex-none items-center justify-center group"
                    onMouseDown={handleLeftMouseDown}
                >
                    <div className="w-0.5 h-8 bg-muted-foreground/20 group-hover:bg-primary rounded-full" />
                </div>

                {/* Pane 2: Center (MindMap + Lists) */}
                <div className="flex-1 min-w-0 overflow-hidden h-full">
                    <CenterPane
                        project={selectedProject}
                        groups={currentGroups}
                        tasks={currentTasks}
                        onUpdateGroupTitle={handleUpdateGroupTitle}
                        onUpdateProject={handleUpdateProjectTitle}
                        onCreateGroup={handleCreateGroup}
                        onDeleteGroup={handleDeleteGroup}
                        onCreateTask={handleCreateTask}
                        onUpdateTask={handleUpdateTask}
                        onDeleteTask={handleDeleteTask}
                        onMoveTask={handleMoveTask}
                    />
                </div>

                {/* Right Resize Handle */}
                <div
                    className="hidden lg:flex w-1 h-full bg-border hover:bg-primary/50 cursor-col-resize transition-colors flex-none items-center justify-center group"
                    onMouseDown={handleRightMouseDown}
                >
                    <div className="w-0.5 h-8 bg-muted-foreground/20 group-hover:bg-primary rounded-full" />
                </div>

                {/* Pane 3: Right Sidebar (Calendar) */}
                <div
                    className="hidden lg:block flex-none overflow-hidden h-full"
                    style={{ width: rightSidebarWidth }}
                >
                    <RightSidebar />
                </div>
            </div>
        </TimerProvider>
    )
}

