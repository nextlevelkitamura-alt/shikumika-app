"use client"

import React, { useCallback, useEffect, useMemo } from 'react';
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
    addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Project = Database['public']['Tables']['projects']['Row']

// --- Custom Node for Task Groups (Editable) ---
const GroupNode = ({ data, isConnectable }: NodeProps) => {
    return (
        <div className="relative group">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-muted-foreground" />

            <Card className={`min-w-[150px] p-2 border-2 ${data.isNew ? 'border-dashed border-primary' : 'border-primary/50'} bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all`}>
                <Input
                    defaultValue={data.label}
                    className="h-7 text-xs font-semibold bg-transparent border-none shadow-none focus-visible:ring-0 px-1 text-center"
                    onBlur={(evt) => data.onLabelChange && data.onLabelChange(data.id, evt.target.value)}
                    onKeyDown={(evt) => {
                        if (evt.key === 'Enter') {
                            evt.currentTarget.blur();
                        }
                    }}
                />
            </Card>

            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-muted-foreground" />
        </div>
    );
};

// --- Custom Node for Project (Center) ---
const ProjectNode = ({ data, isConnectable }: NodeProps) => {
    return (
        <div className="relative">
            <div className="w-[180px] h-[60px] flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg text-sm px-4 text-center border-4 border-background">
                {data.label}
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-transparent" />
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
}

export function MindMap({ project, groups, onUpdateGroupTitle }: MindMapProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Calculate layout (Simple Radial/Tree)
    useEffect(() => {
        if (!project) return;

        const centerX = 400;
        const centerY = 100;

        // 1. Project Node
        const projectNode: Node = {
            id: 'project-root',
            type: 'projectNode',
            data: { label: project.title },
            position: { x: centerX - 90, y: centerY }, // Centered based on width
            draggable: false, // Root is static for now
        };

        // 2. Group Nodes (Arranged in a row below for now, or radial?)
        // Let's do a simple horizontal row below the project
        const rowY = centerY + 150;
        const spacingX = 200;
        const totalWidth = (groups.length - 1) * spacingX;
        const startX = centerX - (totalWidth / 2) - 75; // 75 is half of node width approx

        const groupNodes: Node[] = groups.map((group, index) => ({
            id: group.id,
            type: 'groupNode',
            data: {
                label: group.title,
                id: group.id,
                onLabelChange: (id: string, newVal: string) => {
                    // Determine if changed
                    if (newVal !== group.title) {
                        onUpdateGroupTitle(id, newVal)
                    }
                }
            },
            position: { x: startX + (index * spacingX), y: rowY },
        }));

        // 3. Edges
        const groupEdges: Edge[] = groups.map((group) => ({
            id: `e-root-${group.id}`,
            source: 'project-root',
            target: group.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        }));

        setNodes([projectNode, ...groupNodes]);
        setEdges(groupEdges);

    }, [project, groups, onUpdateGroupTitle, setNodes, setEdges]); // Re-calc when data changes

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

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
                attributionPosition="bottom-right"
            >
                <Background gap={12} size={1} />
                <Controls />
            </ReactFlow>
        </div>
    );
}
