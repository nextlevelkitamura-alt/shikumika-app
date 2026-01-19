"use client"

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/database'
import { RealtimeChannel } from '@supabase/supabase-js'

type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type TaskGroupInsert = Database['public']['Tables']['task_groups']['Insert']

interface UseMindMapSyncProps {
    projectId: string | null
    userId: string
    initialGroups: TaskGroup[]
    initialTasks?: Task[]
}

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']

interface UseMindMapSyncReturn {
    groups: TaskGroup[]
    tasks: Task[]
    createGroup: (title: string) => Promise<TaskGroup | null>
    updateGroupTitle: (groupId: string, newTitle: string) => Promise<void>
    deleteGroup: (groupId: string) => Promise<void>

    createTask: (groupId: string, title?: string) => Promise<Task | null>
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
    deleteTask: (taskId: string) => Promise<void>
    moveTask: (taskId: string, newGroupId: string) => Promise<void>

    updateGroupOrder: (groupId: string, newOrderIndex: number) => Promise<void>
    isLoading: boolean
}

export function useMindMapSync({
    projectId,
    userId,
    initialGroups,
    initialTasks = []
}: UseMindMapSyncProps): UseMindMapSyncReturn {
    const supabase = createClient()
    const [groups, setGroups] = useState<TaskGroup[]>(initialGroups)
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        setGroups(initialGroups)
    }, [initialGroups])

    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    // --- Supabase Realtime Subscription ---
    useEffect(() => {
        if (!projectId) return

        // Channel for Groups
        const groupsChannel = supabase.channel(`groups:${projectId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'task_groups', filter: `project_id=eq.${projectId}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newGroup = payload.new as TaskGroup
                        setGroups(prev => [...prev.filter(g => g.id !== newGroup.id), newGroup].sort((a, b) => a.order_index - b.order_index))
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as TaskGroup
                        setGroups(prev => prev.map(g => g.id === updated.id ? updated : g).sort((a, b) => a.order_index - b.order_index))
                    } else if (payload.eventType === 'DELETE') {
                        const deleted = payload.old as { id: string }
                        setGroups(prev => prev.filter(g => g.id !== deleted.id))
                    }
                }
            )
            .subscribe()

        // Channel for Tasks (We need to listen to all tasks related to the groups in this project)
        // Since we can't filter by join easily in realtime, we might filter by user_id or handle it via project context if possible.
        // Actually, tasks don't have project_id directly, they link to groups.
        // But we can listen to `tasks` where `user_id` matches, and then filter locally if they belong to our groups.
        // OR better: if we assume strict hierarchy project->group->task, maybe we just fetch?
        // Let's listen to 'tasks' table globally for this user (RLS handles security) and filter client side or by `group_id` if we could list them.
        // To be simpler and safe: Listen to `tasks` table with no filter (or user filter) and check if group_id exists in our current groups.

        const tasksChannel = supabase.channel(`tasks_project_${projectId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
                (payload) => {
                    // Check if efficient enough. `user_id` filter is good.
                    if (payload.eventType === 'INSERT') {
                        const newTask = payload.new as Task
                        // Check if task belongs to one of our groups
                        setTasks(prev => {
                            if (groups.some(g => g.id === newTask.group_id)) {
                                return [...prev.filter(t => t.id !== newTask.id), newTask]
                            }
                            return prev
                        })
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as Task
                        setTasks(prev => {
                            // If moved TO our group or updated IN our group
                            if (groups.some(g => g.id === updated.group_id)) {
                                return prev.map(t => t.id === updated.id ? updated : t)
                                    // Handle case where it wasn't there before (moved in)
                                    .concat(prev.find(t => t.id === updated.id) ? [] : [updated])
                            }
                            // If moved OUT of our groups
                            if (!groups.some(g => g.id === updated.group_id) && prev.some(t => t.id === updated.id)) {
                                return prev.filter(t => t.id !== updated.id)
                            }
                            return prev
                        })
                    } else if (payload.eventType === 'DELETE') {
                        const deleted = payload.old as { id: string }
                        setTasks(prev => prev.filter(t => t.id !== deleted.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(groupsChannel)
            supabase.removeChannel(tasksChannel)
        }
    }, [projectId, userId, groups, supabase])

    // --- Group Operations ---
    const createGroup = useCallback(async (title: string) => {
        if (!projectId) return null
        setIsLoading(true)
        try {
            const maxOrder = groups.length > 0 ? Math.max(...groups.map(g => g.order_index)) + 1 : 0
            const { data, error } = await supabase.from('task_groups').insert({
                user_id: userId,
                project_id: projectId,
                title,
                order_index: maxOrder
            }).select().single()
            if (error) throw error
            if (data) setGroups(prev => [...prev, data])
            return data
        } catch (e) {
            console.error(e)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [projectId, userId, groups, supabase])

    const updateGroupTitle = useCallback(async (groupId: string, title: string) => {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, title } : g))
        await supabase.from('task_groups').update({ title }).eq('id', groupId)
    }, [supabase])

    const deleteGroup = useCallback(async (groupId: string) => {
        setGroups(prev => prev.filter(g => g.id !== groupId))
        setTasks(prev => prev.filter(t => t.group_id !== groupId)) // Optimistic cascade
        await supabase.from('task_groups').delete().eq('id', groupId)
    }, [supabase])

    const updateGroupOrder = useCallback(async (groupId: string, newOrder: number) => {
        // Placeholder for now
    }, [])

    // --- Task Operations ---
    const createTask = useCallback(async (groupId: string, title: string = "New Task") => {
        try {
            // Calculate priority/order? Default to end of list.
            const groupTasks = tasks.filter(t => t.group_id === groupId)
            const maxPriority = groupTasks.length > 0 ? Math.max(...groupTasks.map(t => t.priority)) + 1 : 0

            const { data, error } = await supabase.from('tasks').insert({
                user_id: userId,
                group_id: groupId,
                title,
                status: 'pending',
                priority: maxPriority,
                actual_time_minutes: 0,
                estimated_time: 0
            }).select().single()

            if (error) throw error
            if (data) setTasks(prev => [...prev, data])
            return data
        } catch (e) {
            console.error(e)
            return null
        }
    }, [userId, tasks, supabase])

    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
        await supabase.from('tasks').update(updates).eq('id', taskId)
    }, [supabase])

    const deleteTask = useCallback(async (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId))
        await supabase.from('tasks').delete().eq('id', taskId)
    }, [supabase])

    const moveTask = useCallback(async (taskId: string, newGroupId: string) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, group_id: newGroupId } : t))
        await supabase.from('tasks').update({ group_id: newGroupId }).eq('id', taskId)
    }, [supabase])


    return {
        groups,
        tasks,
        createGroup,
        updateGroupTitle,
        deleteGroup,
        updateGroupOrder,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        isLoading
    }
}
