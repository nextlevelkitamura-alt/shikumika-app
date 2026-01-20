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

// --- Custom Nodes ---
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
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground/50 !w-1 !h-1" />
    </div>
));
TaskNode.displayName = 'TaskNode';

const nodeTypes = { projectNode: ProjectNode, groupNode: GroupNode, taskNode: TaskNode };
const defaultViewport = { x: 0, y: 0, zoom: 0.8 };

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
    const projectId = project?.id ?? '';
    const groupsJson = JSON.stringify(groups?.map(g => ({ id: g?.id, title: g?.title })) ?? []);
    const tasksJson = JSON.stringify(tasks?.map(t => ({
        id: t?.id,
        title: t?.title,
        status: t?.status,
        group_id: t?.group_id,
        parent_task_id: t?.parent_task_id
    })) ?? []);

    // DERIVED STATE: nodes and edges computed directly from props
    const { nodes, edges } = useMemo(() => {
        const resultNodes: Node[] = [];
        const resultEdges: Edge[] = [];

        if (!projectId) {
            return { nodes: resultNodes, edges: resultEdges };
        }

        try {
            const parsedGroups = JSON.parse(groupsJson) as { id: string; title: string }[];
            const parsedTasks = JSON.parse(tasksJson) as {
                id: string;
                title: string;
                status: string;
                group_id: string;
                parent_task_id: string | null;
            }[];

            // Project node
            resultNodes.push({
                id: 'project-root',
                type: 'projectNode',
                data: { label: project?.title ?? 'Project' },
                position: { x: 50, y: 200 },
            });

            const safeGroups = parsedGroups.filter(g => g?.id);
            const groupIdSet = new Set(safeGroups.map(g => g.id));
            const safeTasks = parsedTasks.filter(t => t?.id && t?.group_id && groupIdSet.has(t.group_id));

            const parentTasks = safeTasks.filter(t => !t.parent_task_id);
            const childTasks = safeTasks.filter(t => t.parent_task_id);

            const childTasksByParent: Record<string, typeof safeTasks> = {};
            for (const task of childTasks) {
                if (task.parent_task_id) {
                    if (!childTasksByParent[task.parent_task_id]) {
                        childTasksByParent[task.parent_task_id] = [];
                    }
                    childTasksByParent[task.parent_task_id].push(task);
                }
            }

            const parentTasksByGroup: Record<string, typeof safeTasks> = {};
            for (const task of parentTasks) {
                if (!parentTasksByGroup[task.group_id]) {
                    parentTasksByGroup[task.group_id] = [];
                }
                parentTasksByGroup[task.group_id].push(task);
            }

            let globalYOffset = 50;

            safeGroups.forEach((group) => {
                const groupY = globalYOffset;

                resultNodes.push({
                    id: group.id,
                    type: 'groupNode',
                    data: { label: group.title ?? 'Group' },
                    position: { x: 300, y: groupY },
                });
                resultEdges.push({
                    id: `e-proj-${group.id}`,
                    source: 'project-root',
                    target: group.id,
                    type: 'smoothstep',
                });

                const groupParentTasks = parentTasksByGroup[group.id] ?? [];
                let taskYOffset = groupY - 20;

                groupParentTasks.forEach((task) => {
                    resultNodes.push({
                        id: task.id,
                        type: 'taskNode',
                        data: { label: task.title ?? 'Task', status: task.status ?? 'todo' },
                        position: { x: 520, y: taskYOffset },
                    });
                    resultEdges.push({
                        id: `e-group-${task.id}`,
                        source: group.id,
                        target: task.id,
                        type: 'smoothstep',
                    });

                    taskYOffset += 45;

                    const children = childTasksByParent[task.id] ?? [];
                    children.forEach((child) => {
                        resultNodes.push({
                            id: child.id,
                            type: 'taskNode',
                            data: { label: child.title ?? 'Subtask', status: child.status ?? 'todo' },
                            position: { x: 720, y: taskYOffset },
                        });
                        resultEdges.push({
                            id: `e-parent-${child.id}`,
                            source: task.id,
                            target: child.id,
                            type: 'smoothstep',
                        });
                        taskYOffset += 40;
                    });
                });

                globalYOffset = Math.max(globalYOffset + 80, taskYOffset + 30);
            });
        } catch (err) {
            console.error('[MindMap] Error creating nodes:', err);
        }

        return { nodes: resultNodes, edges: resultEdges };
    }, [projectId, groupsJson, tasksJson, project?.title]);

    return (
        <div className="w-full h-full bg-muted/5">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                defaultViewport={defaultViewport}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                deleteKeyCode={null}
                nodesConnectable={false}
                nodesDraggable={false}
                panOnScroll={true}
                zoomOnScroll={true}
                minZoom={0.5}
                maxZoom={1.5}
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
