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
                    title: string
                    status: string
                    priority: number
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
                    title: string
                    status?: string
                    priority?: number
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
                    title?: string
                    status?: string
                    priority?: number
                    scheduled_at?: string | null
                    estimated_time?: number
                    actual_time_minutes?: number
                    google_event_id?: string | null
                    created_at?: string
                }
            }
        }
    }
}
