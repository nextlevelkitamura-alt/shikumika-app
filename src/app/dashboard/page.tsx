import { createClient } from "@/utils/supabase/server"
import { DashboardClient } from "./dashboard-client"

export default async function DashboardPage() {
    const supabase = await createClient()

    // Fetch ALL data (Hierarchical)
    // 1. Goals
    const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false })

    // 2. Projects
    const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

    // 3. Groups
    const { data: groups } = await supabase
        .from("task_groups")
        .select("*")
        .order("order_index")

    // 4. Tasks
    const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .order("priority", { ascending: false })

    return (
        <DashboardClient
            initialGoals={goals || []}
            initialProjects={projects || []}
            initialGroups={groups || []}
            initialTasks={tasks || []}
        />
    )
}
