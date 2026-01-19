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
    Connection,
    addEdge,
    useReactFlow,
    ReactFlowProvider,
    NodeDragHandler
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
interface ErrorBoundaryProps {
    children: ReactNode;
}
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class MindMapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('MindMap Error Boundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-destructive/10 text-destructive p-4">
                    <div className="text-center">
                        <p className="font-semibold">マインドマップでエラーが発生しました</p>
                        <p className="text-sm mt-2">{this.state.error?.message}</p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
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

// --- Layout Configuration ---
const projectNodeWidth = 220;
const projectNodeHeight = 80;
const groupNodeWidth = 180;
const groupNodeHeight = 60;
const taskNodeWidth = 160;
const taskNodeHeight = 40;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    if (nodes.length === 0) return { nodes: [], edges: [] };

    try {
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({ rankdir: 'LR' });

        nodes.forEach((node) => {
            let width = groupNodeWidth;
            let height = groupNodeHeight;

            if (node.type === 'projectNode') {
                width = projectNodeWidth;
                height = projectNodeHeight;
            } else if (node.type === 'taskNode') {
                width = taskNodeWidth;
                height = taskNodeHeight;
            }

            dagreGraph.setNode(node.id, { width, height });
        });

        edges.forEach((edge) => {
            if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
                dagreGraph.setEdge(edge.source, edge.target);
            }
        });

        dagre.layout(dagreGraph);

        const layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            if (!nodeWithPosition) return node;

            let width = groupNodeWidth;
            let height = groupNodeHeight;
            if (node.type === 'projectNode') { width = projectNodeWidth; height = projectNodeHeight; }
            else if (node.type === 'taskNode') { width = taskNodeWidth; height = taskNodeHeight; }

            return {
                ...node,
                position: {
                    x: nodeWithPosition.x - width / 2,
                    y: nodeWithPosition.y - height / 2,
                }
            };
        });

        return { nodes: layoutedNodes, edges };
    } catch (error) {
        console.error('[MindMap] Dagre layout error:', error);
        return { nodes, edges };
    }
};

// --- Custom Node for Project (Center) ---
const ProjectNode = ({ data, isConnectable, selected }: NodeProps) => {
    return (
        <div className="relative group">
            <div className={cn(
                "w-[220px] px-6 py-4 rounded-2xl",
                "bg-gradient-to-br from-primary to-primary/80",
                "text-primary-foreground font-bold text-lg",
                "shadow-xl shadow-primary/20",
                "border border-white/10",
                "flex items-center justify-center text-center",
                "transition-all duration-300",
                selected && "ring-4 ring-primary/30 scale-105",
                !selected && "hover:scale-105"
            )}>
                {data.label}
            </div>
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!bg-primary !w-3 !h-3" />
        </div>
    );
};

// --- Custom Node for Task Groups (Editable) ---
const GroupNode = ({ data, isConnectable, selected }: NodeProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (data.isNew && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [data.isNew]);

    const handleBlur = useCallback((evt: React.FocusEvent<HTMLInputElement>) => {
        if (data.onLabelChange && evt.target.value !== data.label) {
            data.onLabelChange(data.id, evt.target.value);
        }
    }, [data]);

    return (
        <div className="relative group">
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!bg-muted-foreground w-2 h-2" />

            <div className={cn(
                "w-[180px] px-4 py-3 rounded-xl",
                "bg-card border shadow-sm",
                "transition-all duration-300",
                selected && "ring-2 ring-primary border-primary shadow-lg scale-105",
                !selected && "border-border hover:border-primary/50",
                data.isNew && "border-dashed border-primary bg-primary/5"
            )}>
                <Input
                    ref={inputRef}
                    defaultValue={data.label}
                    className="h-6 p-0 text-sm font-semibold text-center bg-transparent border-none shadow-none focus-visible:ring-0 focus:text-primary placeholder:text-muted-foreground/50"
                    onBlur={handleBlur}
                    onKeyDown={(evt) => {
                        if (evt.key === 'Enter') {
                            evt.preventDefault();
                            evt.currentTarget.blur();
                        }
                    }}
                />
            </div>

            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!bg-muted-foreground w-2 h-2" />
        </div>
    );
};

// --- Custom Node for Tasks (Leaf) ---
const TaskNode = ({ data, isConnectable, selected }: NodeProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (data.isNew && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [data.isNew]);

    const handleBlur = useCallback((evt: React.FocusEvent<HTMLInputElement>) => {
        if (data.onLabelChange && evt.target.value !== data.label) {
            data.onLabelChange(data.id, evt.target.value);
        }
    }, [data]);

    return (
        <div className="relative group">
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!bg-muted-foreground/50 w-1.5 h-1.5" />

            <div className={cn(
                "w-[160px] px-3 py-2 rounded-lg",
                "bg-background border shadow-sm",
                "transition-all duration-200",
                "flex items-center gap-2",
                selected && "ring-1 ring-primary border-primary shadow-md",
                !selected && "border-border hover:border-primary/30",
                data.isNew && "border-dashed border-primary/50"
            )}>
                <div className={cn("w-2 h-2 rounded-full flex-none", data.status === 'done' ? "bg-primary" : "bg-muted-foreground/30")} />
                <Input
                    ref={inputRef}
                    defaultValue={data.label}
                    className={cn(
                        "h-5 p-0 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 focus:text-foreground placeholder:text-muted-foreground/50",
                        data.status === 'done' && "line-through text-muted-foreground"
                    )}
                    onBlur={handleBlur}
                    onKeyDown={(evt) => {
                        if (evt.key === 'Enter') {
                            evt.preventDefault();
                            evt.currentTarget.blur();
                        }
                    }}
                />
            </div>
        </div>
    );
};


const nodeTypes = {
    projectNode: ProjectNode,
    groupNode: GroupNode,
    taskNode: TaskNode,
};

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
    onUpdateGroupTitle,
    onCreateGroup,
    onDeleteGroup,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
    onMoveTask
}: MindMapProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { getNodes } = useReactFlow();

    // Debounce flag to prevent rapid key presses
    const isProcessingRef = useRef(false);

    // 1. Construct Graph & Layout
    useEffect(() => {
        if (!project) return;

        try {
            const projectNode: Node = {
                id: 'project-root',
                type: 'projectNode',
                data: { label: project.title },
                position: { x: 0, y: 0 },
            };

            const groupNodes: Node[] = groups.map((group) => ({
                id: group.id,
                type: 'groupNode',
                data: {
                    label: group.title,
                    id: group.id,
                    isNew: group.title === 'New Group',
                    onLabelChange: onUpdateGroupTitle
                },
                position: { x: 0, y: 0 },
            }));

            const taskNodes: Node[] = tasks.map((task) => ({
                id: task.id,
                type: 'taskNode',
                data: {
                    label: task.title,
                    id: task.id,
                    status: task.status,
                    groupId: task.group_id,
                    isNew: task.title === 'New Task',
                    onLabelChange: onUpdateTask ? (id: string, newVal: string) => {
                        onUpdateTask(id, { title: newVal }).catch(console.error);
                    } : undefined
                },
                position: { x: 0, y: 0 },
            }));

            const groupIds = new Set(groups.map(g => g.id));

            const groupEdges: Edge[] = groups.map((group) => ({
                id: `e-proj-${group.id}`,
                source: 'project-root',
                target: group.id,
                type: 'smoothstep',
                animated: false,
                style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2, opacity: 0.5 },
            }));

            const taskEdges: Edge[] = tasks
                .filter(task => task.group_id && groupIds.has(task.group_id))
                .map((task) => ({
                    id: `e-group-${task.id}`,
                    source: task.group_id,
                    target: task.id,
                    type: 'smoothstep',
                    animated: false,
                    style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5, opacity: 0.3 },
                }));

            const rawNodes = [projectNode, ...groupNodes, ...taskNodes];
            const rawEdges = [...groupEdges, ...taskEdges];

            const layouted = getLayoutedElements(rawNodes, rawEdges);

            setNodes(layouted.nodes);
            setEdges(layouted.edges);
        } catch (error) {
            console.error('[MindMap] Layout error:', error);
        }

    }, [project, groups, tasks, onUpdateGroupTitle, onUpdateTask, setNodes, setEdges]);


    // 2. Keyboard Shortcuts - SYNCHRONOUS wrapper to avoid unhandled promise rejections
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if editing text
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            // Debounce
            if (isProcessingRef.current) return;

            let selectedNodes: Node[];
            try {
                selectedNodes = getNodes().filter((n) => n.selected);
            } catch {
                return;
            }

            if (selectedNodes.length === 0) return;
            const selectedNode = selectedNodes[0];

            // Helper to safely call async functions
            const safeAsync = (fn: () => Promise<unknown>) => {
                isProcessingRef.current = true;
                fn()
                    .catch((err) => console.error('[MindMap] Async operation failed:', err))
                    .finally(() => {
                        setTimeout(() => { isProcessingRef.current = false; }, 300);
                    });
            };

            // Enter: New Sibling
            if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();

                if (selectedNode.type === 'groupNode' && onCreateGroup) {
                    isProcessingRef.current = true;
                    try {
                        onCreateGroup("New Group");
                    } catch (e) {
                        console.error('[MindMap] Error creating group:', e);
                    }
                    setTimeout(() => { isProcessingRef.current = false; }, 300);
                } else if (selectedNode.type === 'taskNode' && onCreateTask && selectedNode.data?.groupId) {
                    safeAsync(() => onCreateTask(selectedNode.data.groupId, "New Task"));
                }
                return;
            }

            // Tab: New Child
            if (event.key === 'Tab') {
                event.preventDefault();
                event.stopPropagation();

                if (selectedNode.type === 'projectNode' && onCreateGroup) {
                    isProcessingRef.current = true;
                    try {
                        onCreateGroup("New Group");
                    } catch (e) {
                        console.error('[MindMap] Error creating group:', e);
                    }
                    setTimeout(() => { isProcessingRef.current = false; }, 300);
                } else if (selectedNode.type === 'groupNode' && onCreateTask) {
                    safeAsync(() => onCreateTask(selectedNode.id, "New Task"));
                }
                return;
            }

            // Delete / Backspace
            if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();
                event.stopPropagation();

                if (selectedNode.type === 'groupNode' && onDeleteGroup) {
                    isProcessingRef.current = true;
                    try {
                        onDeleteGroup(selectedNode.id);
                    } catch (e) {
                        console.error('[MindMap] Error deleting group:', e);
                    }
                    setTimeout(() => { isProcessingRef.current = false; }, 300);
                } else if (selectedNode.type === 'taskNode' && onDeleteTask) {
                    safeAsync(() => onDeleteTask(selectedNode.id));
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [getNodes, onCreateGroup, onDeleteGroup, onCreateTask, onDeleteTask]);


    // 3. Drag & Drop (Reparenting)
    const onNodeDragStop: NodeDragHandler = useCallback((event, node) => {
        if (!onMoveTask || node.type !== 'taskNode') return;
        if (!node.data?.groupId) return;

        try {
            const allNodes = getNodes();
            const groupNodes = allNodes.filter(n => n.type === 'groupNode' && n.id !== node.data.groupId);

            let closestGroup: Node | null = null;
            let minDistance = 10000;

            const nodeCenterX = node.position.x + taskNodeWidth / 2;
            const nodeCenterY = node.position.y + taskNodeHeight / 2;

            for (const group of groupNodes) {
                const groupCenterX = group.position.x + groupNodeWidth / 2;
                const groupCenterY = group.position.y + groupNodeHeight / 2;

                const dist = Math.sqrt(Math.pow(nodeCenterX - groupCenterX, 2) + Math.pow(nodeCenterY - groupCenterY, 2));
                if (dist < minDistance) {
                    minDistance = dist;
                    closestGroup = group;
                }
            }

            if (closestGroup && minDistance < 150) {
                onMoveTask(node.id, closestGroup.id).catch(console.error);
            }
        } catch (error) {
            console.error('[MindMap] Error in drag stop:', error);
        }
    }, [getNodes, onMoveTask]);


    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge({
            ...params,
            type: 'smoothstep',
        }, eds))
    }, [setEdges]);

    return (
        <div className="w-full h-full bg-muted/5">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.1 }}
                attributionPosition="bottom-right"
                deleteKeyCode={null}
                nodesConnectable={false}
                nodesDraggable={true}
            >
                <Background gap={24} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}

// Wrap with Provider and Error Boundary
export function MindMap(props: MindMapProps) {
    return (
        <MindMapErrorBoundary>
            <ReactFlowProvider>
                <MindMapContent {...props} />
            </ReactFlowProvider>
        </MindMapErrorBoundary>
    );
}
