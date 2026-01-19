export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            goals: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    description: string | null
                    status: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    description?: string | null
                    status?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    description?: string | null
                    status?: string
                    created_at?: string
                }
            }
            projects: {
                Row: {
                    id: string
                    user_id: string
                    goal_id: string
                    title: string
                    purpose: string | null
                    category_tag: string | null
                    priority: number
                    status: string
                    color_theme: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    goal_id: string
                    title: string
                    purpose?: string | null
                    category_tag?: string | null
                    priority?: number
                    status?: string
                    color_theme?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    goal_id?: string
                    title?: string
                    purpose?: string | null
                    category_tag?: string | null
                    priority?: number
                    status?: string
                    color_theme?: string
                    created_at?: string
                }
            }
            task_groups: {
                Row: {
                    id: string
                    user_id: string
                    project_id: string
                    title: string
                    order_index: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    project_id: string
                    title: string
                    order_index?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    project_id?: string
                    title?: string
                    order_index?: number
                    created_at?: string
                }
            }
            tasks: {
                Row: {
                    id: string
                    user_id: string
                    group_id: string
                    parent_task_id: string | null  // NEW: For hierarchical tasks
                    title: string
                    status: string
                    priority: number
                    order_index: number  // NEW: For sorting
                    scheduled_at: string | null
                    estimated_time: number
                    actual_time_minutes: number
                    google_event_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    group_id: string
                    parent_task_id?: string | null
                    title: string
                    status?: string
                    priority?: number
                    order_index?: number
                    scheduled_at?: string | null
                    estimated_time?: number
                    actual_time_minutes?: number
                    google_event_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    group_id?: string
                    parent_task_id?: string | null
                    title?: string
                    status?: string
                    priority?: number
                    order_index?: number
                    scheduled_at?: string | null
                    estimated_time?: number
                    actual_time_minutes?: number
                    google_event_id?: string | null
                    created_at?: string
                }
            }
            ai_suggestions: {
                Row: {
                    id: string
                    user_id: string
                    suggestion_type: string  // 'task_creation', 'task_reschedule', 'calendar_sync'
                    target_task_id: string | null
                    target_group_id: string | null
                    payload: Json  // Flexible data for different suggestion types
                    status: string  // 'pending', 'accepted', 'rejected', 'adjusted'
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    suggestion_type: string
                    target_task_id?: string | null
                    target_group_id?: string | null
                    payload: Json
                    status?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    suggestion_type?: string
                    target_task_id?: string | null
                    target_group_id?: string | null
                    payload?: Json
                    status?: string
                    created_at?: string
                }
            }
        }
    }
}
