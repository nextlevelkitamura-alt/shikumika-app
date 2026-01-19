"use client"

import { useCallback, useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/database'

type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

interface UseMindMapSyncProps {
    projectId: string | null
    userId: string
    initialGroups: TaskGroup[]
    initialTasks?: Task[]
}

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

    // Use refs to access latest state without causing effect re-runs
    const groupsRef = useRef(groups)
    const tasksRef = useRef(tasks)

    useEffect(() => { groupsRef.current = groups }, [groups])
    useEffect(() => { tasksRef.current = tasks }, [tasks])

    useEffect(() => {
        setGroups(initialGroups)
    }, [initialGroups])

    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    // --- Supabase Realtime Subscription ---
    useEffect(() => {
        if (!projectId || !userId) return

        console.log('[Sync] Setting up Realtime subscription for project:', projectId)

        // Channel for Groups
        const groupsChannel = supabase.channel(`groups:${projectId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'task_groups', filter: `project_id=eq.${projectId}` },
                (payload) => {
                    console.log('[Sync] Groups Realtime:', payload.eventType)
                    try {
                        if (payload.eventType === 'INSERT') {
                            const newGroup = payload.new as TaskGroup
                            setGroups(prev => {
                                if (prev.some(g => g.id === newGroup.id)) return prev
                                return [...prev, newGroup].sort((a, b) => a.order_index - b.order_index)
                            })
                        } else if (payload.eventType === 'UPDATE') {
                            const updated = payload.new as TaskGroup
                            setGroups(prev => prev.map(g => g.id === updated.id ? updated : g).sort((a, b) => a.order_index - b.order_index))
                        } else if (payload.eventType === 'DELETE') {
                            const deleted = payload.old as { id: string }
                            setGroups(prev => prev.filter(g => g.id !== deleted.id))
                        }
                    } catch (err) {
                        console.error('[Sync] Error processing group realtime:', err)
                    }
                }
            )
            .subscribe()

        // Channel for Tasks
        const tasksChannel = supabase.channel(`tasks:${projectId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
                (payload) => {
                    console.log('[Sync] Tasks Realtime:', payload.eventType)
                    try {
                        if (payload.eventType === 'INSERT') {
                            const newTask = payload.new as Task
                            // Use ref to check current groups without stale closure
                            const currentGroups = groupsRef.current
                            if (currentGroups.some(g => g.id === newTask.group_id)) {
                                setTasks(prev => {
                                    if (prev.some(t => t.id === newTask.id)) return prev
                                    return [...prev, newTask]
                                })
                            }
                        } else if (payload.eventType === 'UPDATE') {
                            const updated = payload.new as Task
                            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
                        } else if (payload.eventType === 'DELETE') {
                            const deleted = payload.old as { id: string }
                            setTasks(prev => prev.filter(t => t.id !== deleted.id))
                        }
                    } catch (err) {
                        console.error('[Sync] Error processing task realtime:', err)
                    }
                }
            )
            .subscribe()

        return () => {
            console.log('[Sync] Cleaning up Realtime subscriptions')
            supabase.removeChannel(groupsChannel)
            supabase.removeChannel(tasksChannel)
        }
    }, [projectId, userId, supabase]) // Removed 'groups' from dependencies!

    // --- Group Operations ---
    const createGroup = useCallback(async (title: string) => {
        if (!projectId) return null
        setIsLoading(true)
        try {
            const currentGroups = groupsRef.current
            const maxOrder = currentGroups.length > 0 ? Math.max(...currentGroups.map(g => g.order_index)) + 1 : 0

            console.log('[Sync] Creating group:', title)
            const { data, error } = await supabase.from('task_groups').insert({
                user_id: userId,
                project_id: projectId,
                title,
                order_index: maxOrder
            }).select().single()

            if (error) {
                console.error('[Sync] Error creating group:', error)
                throw error
            }

            // Optimistic update (Realtime will also update, but this is faster)
            if (data) {
                setGroups(prev => {
                    if (prev.some(g => g.id === data.id)) return prev
                    return [...prev, data].sort((a, b) => a.order_index - b.order_index)
                })
            }
            return data
        } catch (e) {
            console.error('[Sync] createGroup failed:', e)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [projectId, userId, supabase])

    const updateGroupTitle = useCallback(async (groupId: string, title: string) => {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, title } : g))
        try {
            await supabase.from('task_groups').update({ title }).eq('id', groupId)
        } catch (e) {
            console.error('[Sync] updateGroupTitle failed:', e)
        }
    }, [supabase])

    const deleteGroup = useCallback(async (groupId: string) => {
        setGroups(prev => prev.filter(g => g.id !== groupId))
        setTasks(prev => prev.filter(t => t.group_id !== groupId))
        try {
            await supabase.from('task_groups').delete().eq('id', groupId)
        } catch (e) {
            console.error('[Sync] deleteGroup failed:', e)
        }
    }, [supabase])

    // --- Task Operations ---
    const createTask = useCallback(async (groupId: string, title: string = "New Task") => {
        console.log('[Sync] Creating task in group:', groupId, 'title:', title)
        try {
            const currentTasks = tasksRef.current
            const groupTasks = currentTasks.filter(t => t.group_id === groupId)
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

            if (error) {
                console.error('[Sync] Error creating task:', error)
                throw error
            }

            // Optimistic update
            if (data) {
                setTasks(prev => {
                    if (prev.some(t => t.id === data.id)) return prev
                    return [...prev, data]
                })
            }
            console.log('[Sync] Task created successfully:', data?.id)
            return data
        } catch (e) {
            console.error('[Sync] createTask failed:', e)
            return null
        }
    }, [userId, supabase])

    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
        try {
            await supabase.from('tasks').update(updates).eq('id', taskId)
        } catch (e) {
            console.error('[Sync] updateTask failed:', e)
        }
    }, [supabase])

    const deleteTask = useCallback(async (taskId: string) => {
        console.log('[Sync] Deleting task:', taskId)
        setTasks(prev => prev.filter(t => t.id !== taskId))
        try {
            await supabase.from('tasks').delete().eq('id', taskId)
        } catch (e) {
            console.error('[Sync] deleteTask failed:', e)
        }
    }, [supabase])

    const moveTask = useCallback(async (taskId: string, newGroupId: string) => {
        console.log('[Sync] Moving task:', taskId, 'to group:', newGroupId)
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, group_id: newGroupId } : t))
        try {
            await supabase.from('tasks').update({ group_id: newGroupId }).eq('id', taskId)
        } catch (e) {
            console.error('[Sync] moveTask failed:', e)
        }
    }, [supabase])


    return {
        groups,
        tasks,
        createGroup,
        updateGroupTitle,
        deleteGroup,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        isLoading
    }
}
