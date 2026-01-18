"use client"

import React, { useCallback, useEffect, useState } from 'react';
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
    Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Project = Database['public']['Tables']['projects']['Row']

// --- Custom Node for Task Groups (Editable) ---
const GroupNode = ({ data, isConnectable, selected }: NodeProps) => {
    return (
        <div className="relative group">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-muted-foreground w-2 h-2" />

            <div className={`
                min-w-[160px] px-4 py-3 rounded-xl 
                bg-card border transition-all duration-300
                ${data.isNew ? 'border-dashed border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                ${selected ? 'ring-2 ring-primary' : ''}
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

                {/* Delete button (visible on hover) */}
                {data.onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onDelete(data.id);
                        }}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                )}
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

// --- Add Node Button ---
const AddNodeButton = ({ data }: NodeProps) => {
    return (
        <button
            onClick={() => data.onAdd && data.onAdd()}
            className="
                w-12 h-12 rounded-full 
                bg-muted/50 border-2 border-dashed border-muted-foreground/30
                hover:bg-primary/10 hover:border-primary/50
                flex items-center justify-center
                transition-all duration-200 hover:scale-110
            "
        >
            <Plus className="w-5 h-5 text-muted-foreground" />
        </button>
    );
};

const nodeTypes = {
    groupNode: GroupNode,
    projectNode: ProjectNode,
    addButton: AddNodeButton,
};

interface MindMapProps {
    project: Project
    groups: TaskGroup[]
    onUpdateGroupTitle: (groupId: string, newTitle: string) => void
    onCreateGroup?: (title: string) => void
    onDeleteGroup?: (groupId: string) => void
}

export function MindMap({
    project,
    groups,
    onUpdateGroupTitle,
    onCreateGroup,
    onDeleteGroup
}: MindMapProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Calculate layout
    useEffect(() => {
        if (!project) return;

        const centerX = 400;
        const centerY = 80;

        // 1. Project Node
        const projectNode: Node = {
            id: 'project-root',
            type: 'projectNode',
            data: { label: project.title },
            position: { x: centerX - 100, y: centerY },
            draggable: false,
        };

        // 2. Group Nodes
        const rowY = centerY + 150;
        const spacingX = 200;
        const totalWidth = groups.length * spacingX;
        const startX = centerX - (totalWidth / 2);

        const groupNodes: Node[] = groups.map((group, index) => ({
            id: group.id,
            type: 'groupNode',
            data: {
                label: group.title,
                id: group.id,
                onLabelChange: (id: string, newVal: string) => {
                    if (newVal !== group.title) {
                        onUpdateGroupTitle(id, newVal)
                    }
                },
                onDelete: onDeleteGroup ? (id: string) => {
                    if (confirm('このグループを削除しますか？（タスクも一緒に削除されます）')) {
                        onDeleteGroup(id)
                    }
                } : undefined
            },
            position: { x: startX + (index * spacingX), y: rowY },
        }));

        // 3. Add Button Node (at the end of groups row)
        const addButtonNode: Node = {
            id: 'add-group-button',
            type: 'addButton',
            data: {
                onAdd: () => {
                    if (onCreateGroup) {
                        const title = prompt('新しいグループ名を入力してください:');
                        if (title && title.trim()) {
                            onCreateGroup(title.trim());
                        }
                    }
                }
            },
            position: { x: startX + (groups.length * spacingX), y: rowY + 6 },
            draggable: false,
        };

        // 4. Edges
        const groupEdges: Edge[] = groups.map((group) => ({
            id: `e-root-${group.id}`,
            source: 'project-root',
            target: group.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        }));

        setNodes([projectNode, ...groupNodes, addButtonNode]);
        setEdges(groupEdges);

    }, [project, groups, onUpdateGroupTitle, onCreateGroup, onDeleteGroup, setNodes, setEdges]);

    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge({
            ...params,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
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
                deleteKeyCode={null} // Disable delete key (we use custom delete)
            >
                <Background gap={16} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
                <Controls showInteractive={false} />

                {/* Toolbar Panel */}
                <Panel position="top-right" className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            if (onCreateGroup) {
                                const title = prompt('新しいグループ名を入力してください:');
                                if (title && title.trim()) {
                                    onCreateGroup(title.trim());
                                }
                            }
                        }}
                        className="gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        グループ追加
                    </Button>
                </Panel>
            </ReactFlow>
        </div>
    );
}
