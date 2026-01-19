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

    useEffect(() => { setGroups(initialGroups) }, [initialGroups])
    useEffect(() => { setTasks(initialTasks) }, [initialTasks])

    // TEMPORARILY DISABLED REALTIME TO PREVENT CRASH
    // TODO: Re-enable with proper error handling once the root cause is identified
    /*
    useEffect(() => {
        if (!projectId || !userId) return
        // ... realtime subscription code ...
    }, [projectId, userId, supabase])
    */

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
            if (data) setGroups(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index))
            return data
        } catch (e) {
            console.error('[Sync] createGroup failed:', e)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [projectId, userId, groups, supabase])

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
        try {
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
            console.error('[Sync] createTask failed:', e)
            return null
        }
    }, [userId, tasks, supabase])

    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
        try {
            await supabase.from('tasks').update(updates).eq('id', taskId)
        } catch (e) {
            console.error('[Sync] updateTask failed:', e)
        }
    }, [supabase])

    const deleteTask = useCallback(async (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId))
        try {
            await supabase.from('tasks').delete().eq('id', taskId)
        } catch (e) {
            console.error('[Sync] deleteTask failed:', e)
        }
    }, [supabase])

    const moveTask = useCallback(async (taskId: string, newGroupId: string) => {
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
