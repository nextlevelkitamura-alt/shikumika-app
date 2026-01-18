import { createClient } from "@/utils/supabase/server"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { CenterPane } from "@/components/dashboard/center-pane"
import { RightSidebar } from "@/components/dashboard/right-sidebar"

// Mock Data for Demo/Fallback
const MOCK_PROJECTS = [
    { id: 'mock-1', title: 'メルカリで10万円', purpose: '副業の柱を作る', priority: 5, status: 'active', category_tag: 'Side Biz' },
    { id: 'mock-2', title: 'SNS運用', purpose: '認知拡大', priority: 3, status: 'on_hold', category_tag: 'Marketing' },
    { id: 'mock-3', title: '新規サービス開発', purpose: 'Shikumika App', priority: 4, status: 'active', category_tag: 'Dev' },
]

const MOCK_GROUPS = [
    {
        id: 'g-1',
        title: '出品準備',
        order_index: 0,
        tasks: [
            { id: 't-1', title: '出品準備を確認', status: 'done', priority: 3, estimated_time: 15 },
            { id: 't-2', title: '出品準備明細', status: 'todo', priority: 4, estimated_time: 30 },
            { id: 't-3', title: '出品準備出庫', status: 'todo', priority: 2, estimated_time: 45 },
        ]
    },
    {
        id: 'g-2',
        title: '発送対応',
        order_index: 1,
        tasks: [
            { id: 't-4', title: '発送対応を発送する', status: 'todo', priority: 5, estimated_time: 10 },
            { id: 't-5', title: '発送対応を発定する', status: 'todo', priority: 3, estimated_time: 20 },
        ]
    },
    {
        id: 'g-3',
        title: 'リサーチ',
        order_index: 2,
        tasks: [
            { id: 't-6', title: 'リサーチの健衰', status: 'todo', priority: 4, estimated_time: 60 },
            { id: 't-7', title: '表殻をある', status: 'todo', priority: 1, estimated_time: 120 },
        ]
    }
]

export default async function DashboardPage() {
    const supabase = await createClient()

    // 1. Fetch Projects
    const { data: dbProjects } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

    const projects = dbProjects && dbProjects.length > 0 ? dbProjects : MOCK_PROJECTS

    // 2. Fetch Task Groups & Tasks (for the Active Project)
    let groupsWithTasks: any[] = []

    // Use real DB logic if we have real projects, otherwise use Mock
    if (dbProjects && dbProjects.length > 0) {
        const targetProjectId = dbProjects[0].id
        const { data: groups } = await supabase
            .from("task_groups")
            .select(`
            *,
            tasks (*)
        `)
            .eq("project_id", targetProjectId)
            .order("order_index")

        if (groups) {
            groupsWithTasks = groups
        }
    } else {
        // Fallback to Mock Groups
        groupsWithTasks = MOCK_GROUPS
    }

    return (
        <div className="flex h-full w-full">
            {/* Pane 1: Left Sidebar (Desktop only) */}
            <div className="hidden md:block w-[250px] lg:w-[300px] flex-none overflow-hidden h-full">
                <LeftSidebar projects={projects} />
            </div>

            {/* Pane 2: Center (MindMap + Lists) */}
            <div className="flex-1 min-w-0 overflow-hidden border-r border-l h-full">
                <CenterPane groups={groupsWithTasks} />
            </div>

            {/* Pane 3: Right Sidebar (Calendar) */}
            <div className="hidden lg:block w-[300px] flex-none overflow-hidden h-full">
                <RightSidebar />
            </div>
        </div>
    )
}
