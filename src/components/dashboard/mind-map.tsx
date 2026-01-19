"use client"

import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    NodeProps,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

// --- Error Boundary ---
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class MindMapErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[MindMap Error Boundary]', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full bg-muted/5 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <p className="text-sm">マインドマップを読み込み中...</p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="text-xs text-primary underline mt-2"
                        >
                            再試行
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- Safe Layout with defensive checks ---
const layoutNodes = (project: Project | null | undefined, groups: TaskGroup[], tasks: Task[]): { nodes: Node[], edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Defensive: Return empty if no project
    if (!project || !project.id) {
        return { nodes: [], edges: [] };
    }

    try {
        // Project node
        nodes.push({
            id: 'project-root',
            type: 'projectNode',
            data: { label: project.title || 'Project' },
            position: { x: 50, y: 200 },
        });

        // Defensive: Ensure groups is an array
        const safeGroups = Array.isArray(groups) ? groups : [];

        // Group nodes
        safeGroups.forEach((group, index) => {
            if (!group || !group.id) return;

            nodes.push({
                id: group.id,
                type: 'groupNode',
                data: { label: group.title || 'Group', id: group.id },
                position: { x: 300, y: 50 + index * 100 },
            });
            edges.push({
                id: `e-proj-${group.id}`,
                source: 'project-root',
                target: group.id,
                type: 'smoothstep',
            });
        });

        // Defensive: Ensure tasks is an array
        const safeTasks = Array.isArray(tasks) ? tasks : [];

        // Filter tasks to only those with valid group_id that exists in groups
        const groupIds = new Set(safeGroups.map(g => g.id));
        const validTasks = safeTasks.filter(t => t && t.id && t.group_id && groupIds.has(t.group_id));

        // Task nodes by group
        const tasksByGroup: Record<string, Task[]> = {};
        validTasks.forEach(task => {
            if (!tasksByGroup[task.group_id]) tasksByGroup[task.group_id] = [];
            tasksByGroup[task.group_id].push(task);
        });

        safeGroups.forEach((group, groupIndex) => {
            if (!group || !group.id) return;

            const groupTasks = tasksByGroup[group.id] || [];
            groupTasks.forEach((task, taskIndex) => {
                nodes.push({
                    id: task.id,
                    type: 'taskNode',
                    data: {
                        label: task.title || 'Task',
                        id: task.id,
                        groupId: task.group_id,
                        status: task.status || 'todo'
                    },
                    position: { x: 520, y: 30 + groupIndex * 100 + taskIndex * 50 },
                });
                edges.push({
                    id: `e-group-${task.id}`,
                    source: group.id,
                    target: task.id,
                    type: 'smoothstep',
                });
            });
        });
    } catch (err) {
        console.error('[MindMap layoutNodes] Error during layout:', err);
        return { nodes: [], edges: [] };
    }

    return { nodes, edges };
};

// --- Custom Nodes ---
const ProjectNode = ({ data, selected }: NodeProps) => (
    <div className={cn(
        "w-[180px] px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-center shadow-lg",
        selected && "ring-2 ring-white"
    )}>
        {data?.label || 'Project'}
        <Handle type="source" position={Position.Right} className="!bg-primary-foreground" />
    </div>
);

const GroupNode = ({ data, selected }: NodeProps) => (
    <div className={cn(
        "w-[150px] px-3 py-2 rounded-lg bg-card border text-sm font-medium text-center shadow",
        selected && "ring-2 ring-primary border-primary"
    )}>
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
        {data?.label || 'Group'}
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
);

const TaskNode = ({ data, selected }: NodeProps) => (
    <div className={cn(
        "w-[130px] px-2 py-1.5 rounded bg-background border text-xs shadow-sm flex items-center gap-1",
        selected && "ring-1 ring-primary border-primary"
    )}>
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground/50 !w-1 !h-1" />
        <div className={cn("w-1.5 h-1.5 rounded-full", data?.status === 'done' ? "bg-primary" : "bg-muted-foreground/30")} />
        <span className={cn("truncate", data?.status === 'done' && "line-through text-muted-foreground")}>{data?.label || 'Task'}</span>
    </div>
);

const nodeTypes = { projectNode: ProjectNode, groupNode: GroupNode, taskNode: TaskNode };

interface MindMapProps {
    project: Project
    groups: TaskGroup[]
    tasks: Task[]
    onUpdateGroupTitle: (groupId: string, newTitle: string) => void
    onCreateGroup?: (title: string) => void
    onDeleteGroup?: (groupId: string) => void
    onCreateTask?: (groupId: string, title?: string, parentTaskId?: string | null) => Promise<Task | null>
    onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>
    onDeleteTask?: (taskId: string) => Promise<void>
    onMoveTask?: (taskId: string, newGroupId: string) => Promise<void>
}

function MindMapContent({
    project,
    groups,
    tasks,
}: MindMapProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [layoutError, setLayoutError] = useState(false);

    // Layout effect with error handling
    useEffect(() => {
        if (!project) {
            setNodes([]);
            setEdges([]);
            return;
        }

        try {
            const { nodes: layoutedNodes, edges: layoutedEdges } = layoutNodes(project, groups, tasks);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
            setLayoutError(false);
        } catch (err) {
            console.error('[MindMap] Layout error:', err);
            setLayoutError(true);
            setNodes([]);
            setEdges([]);
        }
    }, [project, groups, tasks, setNodes, setEdges]);

    if (layoutError) {
        return (
            <div className="w-full h-full bg-muted/5 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">レイアウトエラー</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-muted/5">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                deleteKeyCode={null}
                nodesConnectable={false}
                nodesDraggable={false}
                panOnScroll={true}
                zoomOnScroll={true}
            >
                <Background gap={20} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}

export function MindMap(props: MindMapProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!mounted) {
        return <div className="w-full h-full bg-muted/5 flex items-center justify-center text-muted-foreground">Loading...</div>;
    }

    return (
        <MindMapErrorBoundary>
            <ReactFlowProvider>
                <MindMapContent {...props} />
            </ReactFlowProvider>
        </MindMapErrorBoundary>
    );
}
