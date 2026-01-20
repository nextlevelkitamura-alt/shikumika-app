"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { CenterPane } from "@/components/dashboard/center-pane"
import { RightSidebar } from "@/components/dashboard/right-sidebar"
import { Database } from "@/types/database"
import { useMindMapSync } from "@/hooks/useMindMapSync"
import { TimerProvider } from "@/contexts/TimerContext"

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

    return (
        <TimerProvider tasks={currentTasks} onUpdateTask={updateTask}>
            <div className="flex h-full w-full">
                {/* Pane 1: Left Sidebar */}
                <div className="hidden md:block w-[250px] lg:w-[300px] flex-none overflow-hidden h-full">
                    <LeftSidebar
                        goals={goals}
                        selectedGoalId={selectedGoalId}
                        onSelectGoal={setSelectedGoalId}
                        projects={filteredProjects}
                        selectedProjectId={selectedProjectId}
                        onSelectProject={setSelectedProjectId}
                    />
                </div>

                {/* Pane 2: Center (MindMap + Lists) */}
                <div className="flex-1 min-w-0 overflow-hidden border-r border-l h-full">
                    <CenterPane
                        project={selectedProject}
                        groups={currentGroups}
                        tasks={currentTasks}
                        onUpdateGroupTitle={handleUpdateGroupTitle}
                        onCreateGroup={handleCreateGroup}
                        onDeleteGroup={handleDeleteGroup}
                        onCreateTask={createTask}
                        onUpdateTask={updateTask}
                        onDeleteTask={deleteTask}
                        onMoveTask={moveTask}
                    />
                </div>

                {/* Pane 3: Right Sidebar (Calendar) */}
                <div className="hidden lg:block w-[300px] flex-none overflow-hidden h-full">
                    <RightSidebar />
                </div>
            </div>
        </TimerProvider>
    )
}
