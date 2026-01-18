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
}

interface UseMindMapSyncReturn {
    groups: TaskGroup[]
    createGroup: (title: string) => Promise<TaskGroup | null>
    updateGroupTitle: (groupId: string, newTitle: string) => Promise<void>
    deleteGroup: (groupId: string) => Promise<void>
    updateGroupOrder: (groupId: string, newOrderIndex: number) => Promise<void>
    isLoading: boolean
}

export function useMindMapSync({
    projectId,
    userId,
    initialGroups
}: UseMindMapSyncProps): UseMindMapSyncReturn {
    const supabase = createClient()
    const [groups, setGroups] = useState<TaskGroup[]>(initialGroups)
    const [isLoading, setIsLoading] = useState(false)

    // --- Sync initial groups when props change ---
    useEffect(() => {
        setGroups(initialGroups)
    }, [initialGroups])

    // --- Supabase Realtime Subscription ---
    useEffect(() => {
        if (!projectId) return

        const channel: RealtimeChannel = supabase
            .channel(`task_groups:${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'task_groups',
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    console.log('Realtime update:', payload)

                    if (payload.eventType === 'INSERT') {
                        const newGroup = payload.new as TaskGroup
                        setGroups(prev => {
                            // Avoid duplicates
                            if (prev.find(g => g.id === newGroup.id)) return prev
                            return [...prev, newGroup].sort((a, b) => a.order_index - b.order_index)
                        })
                    }

                    if (payload.eventType === 'UPDATE') {
                        const updatedGroup = payload.new as TaskGroup
                        setGroups(prev =>
                            prev.map(g => g.id === updatedGroup.id ? updatedGroup : g)
                                .sort((a, b) => a.order_index - b.order_index)
                        )
                    }

                    if (payload.eventType === 'DELETE') {
                        const deletedGroup = payload.old as { id: string }
                        setGroups(prev => prev.filter(g => g.id !== deletedGroup.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [projectId, supabase])

    // --- CRUD Operations ---

    const createGroup = useCallback(async (title: string): Promise<TaskGroup | null> => {
        if (!projectId || !userId) return null
        setIsLoading(true)

        try {
            // Get max order_index
            const maxOrder = groups.length > 0
                ? Math.max(...groups.map(g => g.order_index)) + 1
                : 0

            const newGroup: TaskGroupInsert = {
                user_id: userId,
                project_id: projectId,
                title,
                order_index: maxOrder
            }

            const { data, error } = await supabase
                .from('task_groups')
                .insert(newGroup)
                .select()
                .single()

            if (error) throw error

            // Optimistic update (Realtime will also trigger, but this is faster)
            if (data) {
                setGroups(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index))
            }

            return data
        } catch (error) {
            console.error('Failed to create group:', error)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [projectId, userId, groups, supabase])

    const updateGroupTitle = useCallback(async (groupId: string, newTitle: string): Promise<void> => {
        // Optimistic update
        setGroups(prev => prev.map(g =>
            g.id === groupId ? { ...g, title: newTitle } : g
        ))

        try {
            const { error } = await supabase
                .from('task_groups')
                .update({ title: newTitle })
                .eq('id', groupId)

            if (error) throw error
        } catch (error) {
            console.error('Failed to update group title:', error)
            // Revert on error (refetch)
            // For now, we'll just log. A more robust solution would refetch.
        }
    }, [supabase])

    const deleteGroup = useCallback(async (groupId: string): Promise<void> => {
        // Optimistic update
        const previousGroups = groups
        setGroups(prev => prev.filter(g => g.id !== groupId))

        try {
            const { error } = await supabase
                .from('task_groups')
                .delete()
                .eq('id', groupId)

            if (error) throw error
        } catch (error) {
            console.error('Failed to delete group:', error)
            // Revert
            setGroups(previousGroups)
        }
    }, [groups, supabase])

    const updateGroupOrder = useCallback(async (groupId: string, newOrderIndex: number): Promise<void> => {
        // Optimistic update
        setGroups(prev => prev.map(g =>
            g.id === groupId ? { ...g, order_index: newOrderIndex } : g
        ).sort((a, b) => a.order_index - b.order_index))

        try {
            const { error } = await supabase
                .from('task_groups')
                .update({ order_index: newOrderIndex })
                .eq('id', groupId)

            if (error) throw error
        } catch (error) {
            console.error('Failed to update group order:', error)
        }
    }, [supabase])

    return {
        groups,
        createGroup,
        updateGroupTitle,
        deleteGroup,
        updateGroupOrder,
        isLoading
    }
}
