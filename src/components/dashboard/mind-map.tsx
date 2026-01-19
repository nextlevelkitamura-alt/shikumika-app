"use client"

import React, { useEffect, useState, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
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
class MindMapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
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
                            onClick={() => this.setState({ hasError: false })}
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

// --- Safe Layout Function ---
function createLayoutNodes(project: Project | null, groups: TaskGroup[], tasks: Task[]): { nodes: Node[], edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (!project?.id) return { nodes, edges };

    try {
        nodes.push({
            id: 'project-root',
            type: 'projectNode',
            data: { label: project.title ?? 'Project' },
            position: { x: 50, y: 200 },
        });

        const safeGroups = (groups ?? []).filter(g => g?.id);
        const groupIds = new Set(safeGroups.map(g => g.id));

        safeGroups.forEach((group, index) => {
            nodes.push({
                id: group.id,
                type: 'groupNode',
                data: { label: group.title ?? 'Group' },
                position: { x: 300, y: 50 + index * 100 },
            });
            edges.push({
                id: `e-proj-${group.id}`,
                source: 'project-root',
                target: group.id,
                type: 'smoothstep',
            });
        });

        const safeTasks = (tasks ?? []).filter(t => t?.id && t?.group_id && groupIds.has(t.group_id));
        const tasksByGroup: Record<string, Task[]> = {};
        safeTasks.forEach(task => {
            const gid = task.group_id;
            if (!tasksByGroup[gid]) tasksByGroup[gid] = [];
            tasksByGroup[gid].push(task);
        });

        safeGroups.forEach((group, groupIndex) => {
            const groupTasks = tasksByGroup[group.id] ?? [];
            groupTasks.forEach((task, taskIndex) => {
                nodes.push({
                    id: task.id,
                    type: 'taskNode',
                    data: { label: task.title ?? 'Task', status: task.status ?? 'todo' },
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
        console.error('[MindMap] Layout error:', err);
        return { nodes: [], edges: [] };
    }

    return { nodes, edges };
}

// --- Custom Nodes ---
const ProjectNode = ({ data }: NodeProps) => (
    <div className="w-[180px] px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-center shadow-lg">
        {data?.label ?? 'Project'}
        <Handle type="source" position={Position.Right} className="!bg-primary-foreground" />
    </div>
);

const GroupNode = ({ data }: NodeProps) => (
    <div className="w-[150px] px-3 py-2 rounded-lg bg-card border text-sm font-medium text-center shadow">
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
        {data?.label ?? 'Group'}
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
);

const TaskNode = ({ data }: NodeProps) => (
    <div className="w-[130px] px-2 py-1.5 rounded bg-background border text-xs shadow-sm flex items-center gap-1">
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground/50 !w-1 !h-1" />
        <div className={cn("w-1.5 h-1.5 rounded-full", data?.status === 'done' ? "bg-primary" : "bg-muted-foreground/30")} />
        <span className={cn("truncate", data?.status === 'done' && "line-through text-muted-foreground")}>{data?.label ?? 'Task'}</span>
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

function MindMapContent({ project, groups, tasks }: MindMapProps) {
    // Use refs to store nodes/edges to avoid state update loops
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    // Track the last data hash to prevent unnecessary updates
    const lastDataHashRef = useRef<string>('');
    const isUpdatingRef = useRef(false);

    // Create a stable hash of the data to detect real changes
    const dataHash = useMemo(() => {
        const groupIds = (groups ?? []).map(g => g?.id).filter(Boolean).sort().join(',');
        const taskInfo = (tasks ?? []).map(t => `${t?.id}:${t?.status}`).filter(Boolean).sort().join(',');
        return `${project?.id}|${groupIds}|${taskInfo}`;
    }, [project?.id, groups, tasks]);

    useEffect(() => {
        // Guard: Skip if data hasn't actually changed
        if (dataHash === lastDataHashRef.current) {
            return;
        }

        // Guard: Skip if already updating
        if (isUpdatingRef.current) {
            return;
        }

        // Mark as updating
        isUpdatingRef.current = true;
        lastDataHashRef.current = dataHash;

        try {
            if (!project?.id) {
                setNodes([]);
                setEdges([]);
                isUpdatingRef.current = false;
                return;
            }

            const safeGroups = Array.isArray(groups) ? groups : [];
            const safeTasks = Array.isArray(tasks) ? tasks : [];

            const { nodes: newNodes, edges: newEdges } = createLayoutNodes(project, safeGroups, safeTasks);

            // Only update if actually different (belt-and-suspenders)
            setNodes(prev => {
                const prevIds = prev.map(n => n.id).join(',');
                const newIds = newNodes.map(n => n.id).join(',');
                if (prevIds === newIds) return prev;
                return newNodes;
            });

            setEdges(prev => {
                const prevIds = prev.map(e => e.id).join(',');
                const newIds = newEdges.map(e => e.id).join(',');
                if (prevIds === newIds) return prev;
                return newEdges;
            });
        } catch (err) {
            console.error('[MindMap] Layout error:', err);
            setNodes([]);
            setEdges([]);
        } finally {
            // Reset update flag after a small delay to prevent rapid re-entry
            setTimeout(() => {
                isUpdatingRef.current = false;
            }, 50);
        }
    }, [dataHash, project, groups, tasks]); // Removed setNodes/setEdges from deps

    return (
        <div className="w-full h-full bg-muted/5">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                deleteKeyCode={null}
                nodesConnectable={false}
                nodesDraggable={false}
                panOnScroll={true}
                zoomOnScroll={true}
                minZoom={0.5}
                maxZoom={1.5}
            // REMOVED: onNodesChange and onEdgesChange to prevent circular updates
            >
                <Background gap={20} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}

export function MindMap(props: MindMapProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
