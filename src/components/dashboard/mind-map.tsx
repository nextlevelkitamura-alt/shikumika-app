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
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-muted-foreground w-2 h-2" />

            <div className={`
                min-w-[160px] px-4 py-3 rounded-xl 
                bg-card border transition-all duration-300
                ${data.isNew ? 'border-dashed border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                shadow-sm hover:shadow-lg hover:-translate-y-0.5
            `}>
                <Input
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

            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-muted-foreground w-2 h-2" />
        </div>
    );
};

// --- Custom Node for Project (Center) ---
const ProjectNode = ({ data, isConnectable }: NodeProps) => {
    return (
        <div className="relative group">
            <div className="
                min-w-[200px] px-6 py-4 rounded-2xl
                bg-gradient-to-br from-primary to-primary/80 
                text-primary-foreground font-bold text-lg 
                shadow-xl shadow-primary/20 
                border border-white/10
                flex items-center justify-center text-center
                transition-transform hover:scale-105
            ">
                {data.label}
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-primary !w-3 !h-3" />
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
