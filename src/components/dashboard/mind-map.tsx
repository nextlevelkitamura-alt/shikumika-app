"use client"

import React, { useCallback, useEffect, useRef, useState, Component, ErrorInfo, ReactNode } from 'react';
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
    useReactFlow,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import dagre from 'dagre';
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
        console.error('[MindMap ErrorBoundary]', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-muted/20 p-4">
                    <div className="text-center">
                        <p className="text-muted-foreground">マインドマップを読み込み中...</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                        >
                            リロード
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- Simple Layout (no dagre to avoid crashes) ---
const layoutNodes = (project: Project, groups: TaskGroup[], tasks: Task[]): { nodes: Node[], edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Project node
    nodes.push({
        id: 'project-root',
        type: 'projectNode',
        data: { label: project.title },
        position: { x: 50, y: 200 },
    });

    // Group nodes
    groups.forEach((group, index) => {
        nodes.push({
            id: group.id,
            type: 'groupNode',
            data: { label: group.title, id: group.id },
            position: { x: 300, y: 50 + index * 100 },
        });
        edges.push({
            id: `e-proj-${group.id}`,
            source: 'project-root',
            target: group.id,
            type: 'smoothstep',
        });
    });

    // Task nodes
    const tasksByGroup: Record<string, Task[]> = {};
    tasks.forEach(task => {
        if (!tasksByGroup[task.group_id]) tasksByGroup[task.group_id] = [];
        tasksByGroup[task.group_id].push(task);
    });

    groups.forEach((group, groupIndex) => {
        const groupTasks = tasksByGroup[group.id] || [];
        groupTasks.forEach((task, taskIndex) => {
            nodes.push({
                id: task.id,
                type: 'taskNode',
                data: { label: task.title, id: task.id, groupId: task.group_id, status: task.status },
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

    return { nodes, edges };
};

// --- Custom Nodes ---
const ProjectNode = ({ data, selected }: NodeProps) => (
    <div className={cn(
        "w-[180px] px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-center shadow-lg",
        selected && "ring-2 ring-white"
    )}>
        {data.label}
        <Handle type="source" position={Position.Right} className="!bg-primary-foreground" />
    </div>
);

const GroupNode = ({ data, selected }: NodeProps) => (
    <div className={cn(
        "w-[150px] px-3 py-2 rounded-lg bg-card border text-sm font-medium text-center shadow",
        selected && "ring-2 ring-primary border-primary"
    )}>
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
        {data.label}
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
);

const TaskNode = ({ data, selected }: NodeProps) => (
    <div className={cn(
        "w-[130px] px-2 py-1.5 rounded bg-background border text-xs shadow-sm flex items-center gap-1",
        selected && "ring-1 ring-primary border-primary"
    )}>
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground/50 !w-1 !h-1" />
        <div className={cn("w-1.5 h-1.5 rounded-full", data.status === 'done' ? "bg-primary" : "bg-muted-foreground/30")} />
        <span className={cn("truncate", data.status === 'done' && "line-through text-muted-foreground")}>{data.label}</span>
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
    onCreateTask?: (groupId: string, title?: string) => Promise<Task | null>
    onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>
    onDeleteTask?: (taskId: string) => Promise<void>
    onMoveTask?: (taskId: string, newGroupId: string) => Promise<void>
}

function MindMapContent({
    project,
    groups,
    tasks,
    onCreateGroup,
    onDeleteGroup,
    onCreateTask,
    onDeleteTask,
}: MindMapProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { getNodes } = useReactFlow();
    const processingRef = useRef(false);

    // Layout effect - wrapped in try-catch
    useEffect(() => {
        if (!project) return;
        try {
            const { nodes: layoutedNodes, edges: layoutedEdges } = layoutNodes(project, groups, tasks);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        } catch (err) {
            console.error('[MindMap] Layout error:', err);
        }
    }, [project, groups, tasks, setNodes, setEdges]);

    // Keyboard handler - completely synchronous with all errors caught
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            try {
                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                if (processingRef.current) return;

                const selected = getNodes().find(n => n.selected);
                if (!selected) return;

                if (e.key === 'Tab') {
                    e.preventDefault();
                    e.stopPropagation();
                    processingRef.current = true;

                    if (selected.type === 'projectNode' && onCreateGroup) {
                        onCreateGroup("New Group");
                    } else if (selected.type === 'groupNode' && onCreateTask) {
                        onCreateTask(selected.id, "New Task").catch(console.error);
                    }

                    setTimeout(() => { processingRef.current = false; }, 500);
                }

                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    processingRef.current = true;

                    if (selected.type === 'groupNode' && onCreateGroup) {
                        onCreateGroup("New Group");
                    } else if (selected.type === 'taskNode' && onCreateTask && selected.data?.groupId) {
                        onCreateTask(selected.data.groupId, "New Task").catch(console.error);
                    }

                    setTimeout(() => { processingRef.current = false; }, 500);
                }

                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    e.stopPropagation();
                    processingRef.current = true;

                    if (selected.type === 'groupNode' && onDeleteGroup) {
                        onDeleteGroup(selected.id);
                    } else if (selected.type === 'taskNode' && onDeleteTask) {
                        onDeleteTask(selected.id).catch(console.error);
                    }

                    setTimeout(() => { processingRef.current = false; }, 500);
                }
            } catch (err) {
                console.error('[MindMap] Keyboard handler error:', err);
                processingRef.current = false;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [getNodes, onCreateGroup, onDeleteGroup, onCreateTask, onDeleteTask]);

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
            >
                <Background gap={20} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}

export function MindMap(props: MindMapProps) {
    // Additional safety wrapper
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
