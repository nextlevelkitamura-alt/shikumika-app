"use client"

import React, { useMemo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    BackgroundVariant,
    Handle,
    Position,
    NodeProps,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

// --- Dagre Layout ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const NODE_WIDTH = 150;
const NODE_HEIGHT = 40;
const PROJECT_NODE_WIDTH = 200;
const PROJECT_NODE_HEIGHT = 60;
const GROUP_NODE_WIDTH = 160;
const GROUP_NODE_HEIGHT = 50;

function getLayoutedElements(nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } {
    dagreGraph.nodes().forEach(n => dagreGraph.removeNode(n));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 200 });

    nodes.forEach((node) => {
        let width = NODE_WIDTH;
        let height = NODE_HEIGHT;
        if (node.type === 'projectNode') { width = PROJECT_NODE_WIDTH; height = PROJECT_NODE_HEIGHT; }
        else if (node.type === 'groupNode') { width = GROUP_NODE_WIDTH; height = GROUP_NODE_HEIGHT; }
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);

    return {
        nodes: nodes.map((node) => {
            const pos = dagreGraph.node(node.id);
            let width = NODE_WIDTH, height = NODE_HEIGHT;
            if (node.type === 'projectNode') { width = PROJECT_NODE_WIDTH; height = PROJECT_NODE_HEIGHT; }
            else if (node.type === 'groupNode') { width = GROUP_NODE_WIDTH; height = GROUP_NODE_HEIGHT; }
            return { ...node, position: { x: pos.x - width / 2, y: pos.y - height / 2 } };
        }),
        edges
    };
}

// --- Simple Read-Only Nodes ---
const ProjectNode = React.memo(({ data }: NodeProps) => (
    <div className="w-[180px] px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-center shadow-lg">
        {data?.label ?? 'Project'}
        <Handle type="source" position={Position.Right} className="!bg-primary-foreground" />
    </div>
));
ProjectNode.displayName = 'ProjectNode';

const GroupNode = React.memo(({ data, selected }: NodeProps) => (
    <div className={cn(
        "w-[150px] px-3 py-2 rounded-lg bg-card border text-sm font-medium text-center shadow",
        selected && "ring-2 ring-primary"
    )}>
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
        {data?.label ?? 'Group'}
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
));
GroupNode.displayName = 'GroupNode';

const TaskNode = React.memo(({ data, selected }: NodeProps) => (
    <div className={cn(
        "w-[140px] px-2 py-1.5 rounded bg-background border text-xs shadow-sm flex items-center gap-1",
        selected && "ring-2 ring-primary border-primary"
    )}>
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground/50 !w-1 !h-1" />
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", data?.status === 'done' ? "bg-primary" : "bg-muted-foreground/30")} />
        <span className="truncate flex-1">{data?.label ?? 'Task'}</span>
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground/50 !w-1 !h-1" />
    </div>
));
TaskNode.displayName = 'TaskNode';

const nodeTypes = { projectNode: ProjectNode, groupNode: GroupNode, taskNode: TaskNode };

// --- Props ---
interface MindMapViewerProps {
    project?: Project | null
    groups: TaskGroup[]
    tasks: Task[]
    onTaskClick?: (taskId: string) => void
}

// --- Main Component ---
function MindMapViewerContent({ project, groups, tasks, onTaskClick }: MindMapViewerProps) {
    const { nodes, edges } = useMemo(() => {
        const resultNodes: Node[] = [];
        const resultEdges: Edge[] = [];

        if (!project?.id) return { nodes: [], edges: [] };

        // Project Node
        resultNodes.push({
            id: 'project-root',
            type: 'projectNode',
            data: { label: project?.title ?? 'Project' },
            position: { x: 0, y: 0 },
        });

        // Groups and Tasks
        const safeGroups = groups.filter(g => g?.id);
        const safeTasks = tasks.filter(t => t?.id && t?.group_id);

        safeGroups.forEach(group => {
            resultNodes.push({
                id: group.id,
                type: 'groupNode',
                data: { label: group.title || 'グループ' },
                position: { x: 0, y: 0 },
            });
            resultEdges.push({ id: `e-project-${group.id}`, source: 'project-root', target: group.id });

            // Tasks for this group
            const groupTasks = safeTasks.filter(t => t.group_id === group.id);
            const rootTasks = groupTasks.filter(t => !t.parent_task_id);

            const addTaskNodes = (parentId: string, tasksToAdd: Task[]) => {
                tasksToAdd
                    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                    .forEach(task => {
                        resultNodes.push({
                            id: task.id,
                            type: 'taskNode',
                            data: { label: task.title || 'Task', status: task.status },
                            position: { x: 0, y: 0 },
                        });
                        resultEdges.push({ id: `e-${parentId}-${task.id}`, source: parentId, target: task.id });

                        // Children
                        const children = groupTasks.filter(t => t.parent_task_id === task.id);
                        if (children.length > 0) addTaskNodes(task.id, children);
                    });
            };

            addTaskNodes(group.id, rootTasks);
        });

        return getLayoutedElements(resultNodes, resultEdges);
    }, [project, groups, tasks]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => {
                if (node.type === 'taskNode' && onTaskClick) {
                    onTaskClick(node.id);
                }
            }}
            fitView
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            panOnDrag={true}
            zoomOnScroll={true}
        >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(255,255,255,0.03)" />
            <Controls showInteractive={false} />
        </ReactFlow>
    );
}

// --- Export with Provider ---
export default function MindMapViewer(props: MindMapViewerProps) {
    return (
        <ReactFlowProvider>
            <MindMapViewerContent {...props} />
        </ReactFlowProvider>
    );
}
