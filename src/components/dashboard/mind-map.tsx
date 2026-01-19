"use client"

import React, { useMemo, useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
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
                        <p className="text-sm">マインドマップでエラーが発生しました</p>
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

// --- Custom Nodes (Pure Components) ---
const ProjectNode = React.memo(({ data }: NodeProps) => (
    <div className="w-[180px] px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-center shadow-lg">
        {data?.label ?? 'Project'}
        <Handle type="source" position={Position.Right} className="!bg-primary-foreground" />
    </div>
));
ProjectNode.displayName = 'ProjectNode';

const GroupNode = React.memo(({ data }: NodeProps) => (
    <div className="w-[150px] px-3 py-2 rounded-lg bg-card border text-sm font-medium text-center shadow">
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
        {data?.label ?? 'Group'}
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
));
GroupNode.displayName = 'GroupNode';

const TaskNode = React.memo(({ data }: NodeProps) => (
    <div className="w-[130px] px-2 py-1.5 rounded bg-background border text-xs shadow-sm flex items-center gap-1">
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground/50 !w-1 !h-1" />
        <div className={cn("w-1.5 h-1.5 rounded-full", data?.status === 'done' ? "bg-primary" : "bg-muted-foreground/30")} />
        <span className={cn("truncate", data?.status === 'done' && "line-through text-muted-foreground")}>{data?.label ?? 'Task'}</span>
    </div>
));
TaskNode.displayName = 'TaskNode';

// IMPORTANT: Define nodeTypes outside component to prevent recreation
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

/**
 * MindMapContent: Pure rendering component
 * 
 * ONE-WAY DATA FLOW:
 * - nodes and edges are DERIVED STATE (useMemo) from tasks
 * - NO useState for nodes/edges
 * - NO useEffect that modifies nodes/edges
 * - ReactFlow is READ-ONLY (no onNodesChange, onEdgesChange)
 */
function MindMapContent({ project, groups, tasks }: MindMapProps) {
    // DERIVED STATE: Nodes and Edges are computed directly from props
    // This runs on every render, but only recalculates when deps change
    const { nodes, edges } = useMemo(() => {
        const resultNodes: Node[] = [];
        const resultEdges: Edge[] = [];

        // Safety check
        if (!project?.id) {
            return { nodes: resultNodes, edges: resultEdges };
        }

        try {
            // 1. Project node (root)
            resultNodes.push({
                id: 'project-root',
                type: 'projectNode',
                data: { label: project.title ?? 'Project' },
                position: { x: 50, y: 200 },
            });

            // 2. Safe arrays
            const safeGroups = Array.isArray(groups) ? groups.filter(g => g?.id) : [];
            const groupIdSet = new Set(safeGroups.map(g => g.id));
            const safeTasks = Array.isArray(tasks) ? tasks.filter(t => t?.id && t?.group_id && groupIdSet.has(t.group_id)) : [];

            // 3. Group tasks by group_id
            const tasksByGroup: Record<string, Task[]> = {};
            for (const task of safeTasks) {
                if (!tasksByGroup[task.group_id]) {
                    tasksByGroup[task.group_id] = [];
                }
                tasksByGroup[task.group_id].push(task);
            }

            // 4. Create group nodes and edges
            safeGroups.forEach((group, index) => {
                resultNodes.push({
                    id: group.id,
                    type: 'groupNode',
                    data: { label: group.title ?? 'Group' },
                    position: { x: 300, y: 50 + index * 100 },
                });
                resultEdges.push({
                    id: `e-proj-${group.id}`,
                    source: 'project-root',
                    target: group.id,
                    type: 'smoothstep',
                });

                // 5. Create task nodes and edges for this group
                const groupTasks = tasksByGroup[group.id] ?? [];
                groupTasks.forEach((task, taskIndex) => {
                    resultNodes.push({
                        id: task.id,
                        type: 'taskNode',
                        data: {
                            label: task.title ?? 'Task',
                            status: task.status ?? 'todo'
                        },
                        position: { x: 520, y: 30 + index * 100 + taskIndex * 50 },
                    });
                    resultEdges.push({
                        id: `e-group-${task.id}`,
                        source: group.id,
                        target: task.id,
                        type: 'smoothstep',
                    });
                });
            });
        } catch (err) {
            console.error('[MindMap] Error creating nodes:', err);
        }

        return { nodes: resultNodes, edges: resultEdges };
    }, [project, groups, tasks]); // ONLY depends on source data, NOT on nodes/edges

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
            // NO onNodesChange - read-only
            // NO onEdgesChange - read-only
            >
                <Background gap={20} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}

/**
 * MindMap: Wrapper with hydration safety
 */
export function MindMap(props: MindMapProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []); // Empty deps - only runs once

    if (!mounted) {
        return (
            <div className="w-full h-full bg-muted/5 flex items-center justify-center text-muted-foreground">
                Loading...
            </div>
        );
    }

    return (
        <MindMapErrorBoundary>
            <ReactFlowProvider>
                <MindMapContent {...props} />
            </ReactFlowProvider>
        </MindMapErrorBoundary>
    );
}
