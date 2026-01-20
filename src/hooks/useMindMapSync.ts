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
    createTask: (groupId: string, title?: string, parentTaskId?: string | null) => Promise<Task | null>
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
    deleteTask: (taskId: string) => Promise<void>
    moveTask: (taskId: string, newGroupId: string) => Promise<void>
    isLoading: boolean
    // Helper functions for parent-child relationships
    getChildTasks: (parentTaskId: string) => Task[]
    getParentTasks: (groupId: string) => Task[]
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
    // OPTIMISTIC UI: Generate client-side UUID and update local state immediately
    const createTask = useCallback(async (groupId: string, title: string = "New Task", parentTaskId: string | null = null): Promise<Task | null> => {
        // Generate client-side UUID for instant feedback
        const optimisticId = crypto.randomUUID();
        const now = new Date().toISOString();

        const groupTasks = tasks.filter(t => t.group_id === groupId);
        const maxOrder = groupTasks.length > 0 ? Math.max(...groupTasks.map(t => t.order_index ?? 0)) + 1 : 0;

        // Create optimistic task object
        const optimisticTask: Task = {
            id: optimisticId,
            user_id: userId,
            group_id: groupId,
            parent_task_id: parentTaskId,
            title,
            status: 'todo',
            priority: 3,
            order_index: maxOrder,
            scheduled_at: null,
            estimated_time: 0,
            actual_time_minutes: 0,
            google_event_id: null,
            // Timer fields
            total_elapsed_seconds: 0,
            last_started_at: null,
            is_timer_running: false,
            created_at: now,
        };

        // IMMEDIATELY update local state (Optimistic Update)
        setTasks(prev => [...prev, optimisticTask]);

        // Return optimistic task immediately for instant focus
        // Background sync to Supabase
        (async () => {
            try {
                const { data, error } = await supabase.from('tasks').insert({
                    id: optimisticId, // Use the same ID we generated
                    user_id: userId,
                    group_id: groupId,
                    parent_task_id: parentTaskId,
                    title,
                    status: 'todo',
                    priority: 3,
                    order_index: maxOrder,
                    actual_time_minutes: 0,
                    estimated_time: 0
                }).select().single();

                if (error) {
                    throw error;
                }

                // Update with server response (in case of any server-side modifications)
                if (data) {
                    setTasks(prev => prev.map(t => t.id === optimisticId ? data : t));
                }
            } catch (e) {
                console.error('[Sync] createTask failed, rolling back:', e);
                // ROLLBACK: Remove the optimistic task
                setTasks(prev => prev.filter(t => t.id !== optimisticId));
                alert('タスクの作成に失敗しました。もう一度お試しください。');
            }
        })();

        return optimisticTask;
    }, [userId, tasks, supabase]);

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

    // --- Helper Functions for Parent-Child Relationships ---
    const getChildTasks = useCallback((parentTaskId: string): Task[] => {
        return tasks.filter(t => t.parent_task_id === parentTaskId).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    }, [tasks])

    const getParentTasks = useCallback((groupId: string): Task[] => {
        return tasks.filter(t => t.group_id === groupId && !t.parent_task_id).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    }, [tasks])

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
        isLoading,
        getChildTasks,
        getParentTasks
    }
}
