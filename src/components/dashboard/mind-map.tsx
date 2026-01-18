"use client"

import React, { useCallback, useEffect, useRef } from 'react';
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
    Panel,
    useReactFlow,
    ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import dagre from 'dagre';

type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Project = Database['public']['Tables']['projects']['Row']

// --- Layout Configuration ---
const nodeWidth = 200;
const nodeHeight = 60;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: 'LR' }); // Left to Right layout

    nodes.forEach((node) => {
        // Dynamic height based on type
        const height = node.type === 'projectNode' ? 80 : 60;
        dagreGraph.setNode(node.id, { width: nodeWidth, height: height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes, edges };
};

// --- Custom Node for Task Groups (Editable) ---
const GroupNode = ({ data, isConnectable, selected }: NodeProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus if created recently (optimization: strict check can be added)
    useEffect(() => {
        if (data.isNew && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [data.isNew]);

    return (
        <div className="relative group">
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!bg-muted-foreground w-2 h-2" />

            <div className={`
                min-w-[160px] px-4 py-3 rounded-xl 
                bg-card border transition-all duration-300
                ${selected ? 'ring-2 ring-primary border-primary shadow-lg scale-105' : 'border-border hover:border-primary/50'}
                ${data.isNew ? 'border-dashed border-primary bg-primary/5' : ''}
                shadow-sm
            `}>
                <Input
                    ref={inputRef}
                    defaultValue={data.label}
                    className="
                        h-6 p-0 text-sm font-medium text-center bg-transparent border-none shadow-none 
                        focus-visible:ring-0 focus:text-primary placeholder:text-muted-foreground/50
                    "
                    onBlur={(evt) => data.onLabelChange && data.onLabelChange(data.id, evt.target.value)}
                    onKeyDown={(evt) => {
                        if (evt.key === 'Enter') {
                            evt.currentTarget.blur();
                        }
                    }}
                />
            </div>

            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!bg-muted-foreground w-2 h-2" />
        </div>
    );
};

// --- Custom Node for Project (Center) ---
const ProjectNode = ({ data, isConnectable, selected }: NodeProps) => {
    return (
        <div className="relative group">
            <div className={`
                min-w-[200px] px-6 py-4 rounded-2xl
                bg-gradient-to-br from-primary to-primary/80 
                text-primary-foreground font-bold text-lg 
                shadow-xl shadow-primary/20 
                border border-white/10
                flex items-center justify-center text-center
                transition-all duration-300
                ${selected ? 'ring-4 ring-primary/30 scale-105' : 'hover:scale-105'}
            `}>
                {data.label}
            </div>
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!bg-primary !w-3 !h-3" />
        </div>
    );
};

const nodeTypes = {
    groupNode: GroupNode,
    projectNode: ProjectNode,
};

interface MindMapProps {
    project: Project
    groups: TaskGroup[]
    onUpdateGroupTitle: (groupId: string, newTitle: string) => void
    onCreateGroup?: (title: string) => void
    onDeleteGroup?: (groupId: string) => void
}

function MindMapContent({
    project,
    groups,
    onUpdateGroupTitle,
    onCreateGroup,
    onDeleteGroup
}: MindMapProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { getNodes, getEdges } = useReactFlow();

    // 1. Construct Graph & Layout
    useEffect(() => {
        if (!project) return;

        // Nodes
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
                isNew: group.title === 'New Group', // Auto-focus if title is default
                onLabelChange: (id: string, newVal: string) => {
                    if (newVal !== group.title) {
                        onUpdateGroupTitle(id, newVal)
                    }
                }
            },
            position: { x: 0, y: 0 },
        }));

        // Edges
        const groupEdges: Edge[] = groups.map((group) => ({
            id: `e-root-${group.id}`,
            source: 'project-root',
            target: group.id,
            type: 'smoothstep', // XMind style: structured
            animated: false,   // Cleaner look
            style: {
                stroke: 'hsl(var(--muted-foreground))',
                strokeWidth: 2,
                opacity: 0.5
            },
            pathOptions: { borderRadius: 20 } // Rounded corners
        }));

        const rawNodes = [projectNode, ...groupNodes];
        const rawEdges = groupEdges;

        const layouted = getLayoutedElements(rawNodes, rawEdges);

        setNodes(layouted.nodes);
        setEdges(layouted.edges);

    }, [project, groups, onUpdateGroupTitle, setNodes, setEdges]);


    // 2. Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if editing text (Input focused)
            if ((event.target as HTMLElement).tagName === 'INPUT') return;

            // Get selected nodes
            const selectedNodes = getNodes().filter((n) => n.selected);
            if (selectedNodes.length === 0) return;

            const selectedNode = selectedNodes[0]; // Handle primary selection based on single selection for now

            // Enter: New Sibling (for Groups)
            if (event.key === 'Enter') {
                event.preventDefault();
                if (selectedNode.type === 'groupNode' && onCreateGroup) {
                    onCreateGroup("New Group"); // Sibling of group -> implied by just creating a group
                }
            }

            // Tab: New Child (for Project)
            if (event.key === 'Tab') {
                event.preventDefault();
                if (selectedNode.type === 'projectNode' && onCreateGroup) {
                    onCreateGroup("New Group");
                }
            }

            // Delete / Backspace: Delete Node
            if ((event.key === 'Delete' || event.key === 'Backspace') && onDeleteGroup) {
                if (selectedNode.type === 'groupNode') {
                    if (confirm('Delete this group?')) {
                        onDeleteGroup(selectedNode.id);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [getNodes, onCreateGroup, onDeleteGroup]);


    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge({
            ...params,
            type: 'smoothstep',
            style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2, opacity: 0.5 },
            pathOptions: { borderRadius: 20 }
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
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                attributionPosition="bottom-right"
                deleteKeyCode={null} // Handled by custom hook
            >
                <Background gap={20} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}

// Wrap with Provider to use ReactFlow hooks
export function MindMap(props: MindMapProps) {
    return (
        <ReactFlowProvider>
            <MindMapContent {...props} />
        </ReactFlowProvider>
    );
}
