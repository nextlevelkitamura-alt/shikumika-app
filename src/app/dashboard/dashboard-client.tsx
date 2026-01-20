"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { CenterPane } from "@/components/dashboard/center-pane"
import { RightSidebar } from "@/components/dashboard/right-sidebar"
import { Database } from "@/types/database"
import { useMindMapSync } from "@/hooks/useMindMapSync"
import { TimerProvider } from "@/contexts/TimerContext"
import { HistoryProvider, useHistory, HistoryAction } from "@/contexts/HistoryContext"

type Goal = Database['public']['Tables']['goals']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

// Keyboard shortcut handler for Undo/Redo (must be inside HistoryProvider)
function UndoRedoHandler() {
    const history = useHistory();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if in input/textarea (let browser handle standard undo)
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Cmd+Z (Mac) or Ctrl+Z (Windows) for Undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                history.undo();
            }
            // Cmd+Shift+Z (Mac) or Ctrl+Y or Ctrl+Shift+Z (Windows) for Redo
            else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                history.redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history]);

    return null;
}

interface DashboardClientProps {
    initialGoals: Goal[]
    initialProjects: Project[]
    initialGroups: TaskGroup[]
    initialTasks: Task[]
    userId: string
}

// Wrapper component that provides HistoryProvider
export function DashboardClient(props: DashboardClientProps) {
    return (
        <HistoryProvider>
            <UndoRedoHandler />
            <DashboardContent {...props} />
        </HistoryProvider>
    )
}

// Main content component (inside HistoryProvider, can use useHistory)
function DashboardContent({
    initialGoals,
    initialProjects,
    initialGroups,
    initialTasks,
    userId
}: DashboardClientProps) {
    const history = useHistory();

    // State
    const [goals] = useState<Goal[]>(initialGoals)
    const [projects] = useState<Project[]>(initialProjects)

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

    // Auto-select first project when goal changes
    useEffect(() => {
        if (selectedGoalId) {
            const projectsInGoal = projects.filter(p => p.goal_id === selectedGoalId)
            if (projectsInGoal.length > 0 && !projectsInGoal.find(p => p.id === selectedProjectId)) {
                setSelectedProjectId(projectsInGoal[0].id)
            } else if (projectsInGoal.length === 0) {
                setSelectedProjectId(null)
            }
        }
    }, [selectedGoalId])

    const selectedProject = useMemo(() =>
        projects.find(p => p.id === selectedProjectId),
        [projects, selectedProjectId]
    )

    // --- MindMap Sync Hook ---
    const projectGroupsInitial = useMemo(() =>
        initialGroups.filter(g => g.project_id === selectedProjectId),
        [initialGroups, selectedProjectId]
    )

    const projectTasksInitial = useMemo(() => {
        const groupIds = new Set(projectGroupsInitial.map(g => g.id))
        return initialTasks.filter(t => groupIds.has(t.group_id))
    }, [initialTasks, projectGroupsInitial])

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
        isLoading
    } = useMindMapSync({
        projectId: selectedProjectId,
        userId,
        initialGroups: projectGroupsInitial,
        initialTasks: projectTasksInitial
    })

    // === HISTORY-WRAPPED CRUD FUNCTIONS ===

    // Wrapped createTask with history recording
    const createTaskWithHistory = useCallback(async (groupId: string, title?: string, parentTaskId?: string | null): Promise<Task | null> => {
        const newTask = await createTask(groupId, title, parentTaskId);
        if (newTask) {
            const action: HistoryAction = {
                type: 'CREATE_TASK',
                description: `タスク「${newTask.title}」を作成`,
                execute: async () => { await createTask(groupId, title, parentTaskId); },
                reverse: async () => { await deleteTask(newTask.id); }
            };
            history.record(action);
        }
        return newTask;
    }, [createTask, deleteTask, history]);

    // Wrapped deleteTask with history recording
    const deleteTaskWithHistory = useCallback(async (taskId: string) => {
        const taskToDelete = currentTasks.find(t => t.id === taskId);
        if (!taskToDelete) return;

        // Store task data for undo
        const taskData = { ...taskToDelete };

        await deleteTask(taskId);

        const action: HistoryAction = {
            type: 'DELETE_TASK',
            description: `タスク「${taskData.title}」を削除`,
            execute: async () => { await deleteTask(taskId); },
            reverse: async () => {
                // Re-create the task with original data
                await createTask(taskData.group_id, taskData.title ?? '', taskData.parent_task_id);
            }
        };
        history.record(action);
    }, [currentTasks, deleteTask, createTask, history]);

    // DISABLED: updateTaskWithHistory was causing excessive re-renders due to currentTasks dependency
    // This broke text input functionality - using direct updateTask instead
    /*
    const updateTaskWithHistory = useCallback(async (taskId: string, updates: Partial<Task>) => {
        const taskBefore = currentTasks.find(t => t.id === taskId);
        if (!taskBefore) return;

        // Store old values for undo
        const oldValues: Partial<Task> = {};
        for (const key of Object.keys(updates) as (keyof Task)[]) {
            oldValues[key] = taskBefore[key] as any;
        }

        await updateTask(taskId, updates);

        const action: HistoryAction = {
            type: 'UPDATE_TASK',
            description: `タスクを更新`,
            execute: async () => { await updateTask(taskId, updates); },
            reverse: async () => { await updateTask(taskId, oldValues); }
        };
        history.record(action);
    }, [currentTasks, updateTask, history]);
    */


    // STABLE handlers using useCallback
    const handleCreateGroup = useCallback(async (title: string) => {
        await createGroup(title)
    }, [createGroup])

    const handleUpdateGroupTitle = useCallback(async (groupId: string, newTitle: string) => {
        await updateGroupTitle(groupId, newTitle)
    }, [updateGroupTitle])

    const handleDeleteGroup = useCallback(async (groupId: string) => {
        await deleteGroup(groupId)
    }, [deleteGroup])

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
                        onCreateGroup={handleCreateGroup}
                        onDeleteGroup={handleDeleteGroup}
                        onCreateTask={createTaskWithHistory}
                        onUpdateTask={updateTask}
                        onDeleteTask={deleteTaskWithHistory}
                        onMoveTask={moveTask}
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
