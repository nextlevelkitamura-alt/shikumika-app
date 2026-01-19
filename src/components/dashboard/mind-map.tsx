"use client"

import React, { useEffect, useState } from 'react';
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

// --- Simple Layout ---
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

// --- Custom Nodes (Read-only display) ---
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
}: MindMapProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Layout effect
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

    // NO KEYBOARD HANDLERS - Keyboard-based node creation removed to prevent crashes
    // Node creation should be done via UI buttons in the task list below

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
        <ReactFlowProvider>
            <MindMapContent {...props} />
        </ReactFlowProvider>
    );
}
