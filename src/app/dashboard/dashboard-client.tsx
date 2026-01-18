"use client"

import { useState, useEffect } from "react"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { CenterPane } from "@/components/dashboard/center-pane"
import { RightSidebar } from "@/components/dashboard/right-sidebar"
import { Database } from "@/types/database"
import { useMindMapSync } from "@/hooks/useMindMapSync"

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
    const [tasks, setTasks] = useState<Task[]>(initialTasks)

    // Selection State
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
        initialGoals.length > 0 ? initialGoals[0].id : null
    )
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
        initialProjects.length > 0 ? initialProjects[0].id : null
    )

    // Filtered Data
    const filteredProjects = projects.filter(p => p.goal_id === selectedGoalId)

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
    }, [selectedGoalId, projects, selectedProjectId])

    const selectedProject = projects.find(p => p.id === selectedProjectId)

    // --- MindMap Sync Hook ---
    // Get groups for the selected project with Realtime sync
    const projectGroupsInitial = initialGroups.filter(g => g.project_id === selectedProjectId)

    const {
        groups: currentGroups,
        createGroup,
        updateGroupTitle,
        deleteGroup,
        isLoading
    } = useMindMapSync({
        projectId: selectedProjectId,
        userId,
        initialGroups: projectGroupsInitial
    })

    // Get tasks for current groups
    const currentTasks = tasks.filter(t =>
        currentGroups.some(g => g.id === t.group_id)
    )

    // --- Handlers ---
    const handleCreateGroup = async (title: string) => {
        await createGroup(title)
    }

    const handleUpdateGroupTitle = async (groupId: string, newTitle: string) => {
        await updateGroupTitle(groupId, newTitle)
    }

    const handleDeleteGroup = async (groupId: string) => {
        await deleteGroup(groupId)
        // Also remove tasks that belonged to this group from local state
        setTasks(prev => prev.filter(t => t.group_id !== groupId))
    }

    return (
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
                />
            </div>

            {/* Pane 3: Right Sidebar (Calendar) */}
            <div className="hidden lg:block w-[300px] flex-none overflow-hidden h-full">
                <RightSidebar />
            </div>
        </div>
    )
}
