"use client"

import React, { useMemo, useState, useEffect, useCallback, useRef, Component, ErrorInfo, ReactNode } from 'react';
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
    useReactFlow,
    NodeMouseHandler,
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
const ProjectNode = React.memo(({ data, selected }: NodeProps) => (
    <div className={cn(
        "w-[180px] px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-center shadow-lg transition-all",
        selected && "ring-2 ring-white ring-offset-2 ring-offset-background"
    )}>
        {data?.label ?? 'Project'}
        <Handle type="source" position={Position.Right} className="!bg-primary-foreground" />
    </div>
));
ProjectNode.displayName = 'ProjectNode';

const GroupNode = React.memo(({ data, selected }: NodeProps) => (
    <div className={cn(
        "w-[150px] px-3 py-2 rounded-lg bg-card border text-sm font-medium text-center shadow transition-all",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
    )}>
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
        {data?.label ?? 'Group'}
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
));
GroupNode.displayName = 'GroupNode';

// Editable Task Node
const TaskNode = React.memo(({ data, selected }: NodeProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isEditing, setIsEditing] = useState(data?.isEditing ?? false);
    const [editValue, setEditValue] = useState(data?.label ?? 'Task');

    // Auto-focus when entering edit mode
    useEffect(() => {
        if (data?.isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
            setIsEditing(true);
            setEditValue(data?.label ?? 'Task');
        }
    }, [data?.isEditing, data?.label]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        if (editValue !== data?.label && data?.onSave) {
            data.onSave(editValue);
        }
        if (data?.onEditEnd) {
            data.onEditEnd();
        }
    }, [editValue, data]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Stop propagation to prevent MindMap shortcuts
        e.stopPropagation();

        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            inputRef.current?.blur();
        }
        if (e.key === 'Escape') {
            setEditValue(data?.label ?? 'Task');
            setIsEditing(false);
            if (data?.onEditEnd) {
                data.onEditEnd();
            }
        }
    }, [data]);

    const handleDoubleClick = useCallback(() => {
        setIsEditing(true);
        setEditValue(data?.label ?? 'Task');
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 0);
    }, [data?.label]);

    return (
        <div
            className={cn(
                "w-[140px] px-2 py-1.5 rounded bg-background border text-xs shadow-sm flex items-center gap-1 transition-all",
                selected && "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary"
            )}
            onDoubleClick={handleDoubleClick}
        >
            <Handle type="target" position={Position.Left} className="!bg-muted-foreground/50 !w-1 !h-1" />
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", data?.status === 'done' ? "bg-primary" : "bg-muted-foreground/30")} />

            {isEditing || data?.isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none text-xs focus:outline-none focus:ring-0 px-0 min-w-0"
                    autoFocus
                />
            ) : (
                <span className={cn("truncate", data?.status === 'done' && "line-through text-muted-foreground")}>
                    {data?.label ?? 'Task'}
                </span>
            )}

            <Handle type="source" position={Position.Right} className="!bg-muted-foreground/50 !w-1 !h-1" />
        </div>
    );
});
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

function MindMapContent({ project, groups, tasks, onCreateTask, onUpdateTask, onDeleteTask }: MindMapProps) {
    const projectId = project?.id ?? '';
    const groupsJson = JSON.stringify(groups?.map(g => ({ id: g?.id, title: g?.title })) ?? []);
    const tasksJson = JSON.stringify(tasks?.map(t => ({
        id: t?.id,
        title: t?.title,
        status: t?.status,
        group_id: t?.group_id,
        parent_task_id: t?.parent_task_id
    })) ?? []);

    // State
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get task data for selected node
    const selectedTask = useMemo(() => {
        if (!selectedNodeId) return null;
        return tasks.find(t => t.id === selectedNodeId) ?? null;
    }, [selectedNodeId, tasks]);

    // Get group for selected task
    const selectedGroup = useMemo(() => {
        if (!selectedTask) return null;
        return groups.find(g => g.id === selectedTask.group_id) ?? null;
    }, [selectedTask, groups]);

    // Check if selected node has children
    const selectedNodeHasChildren = useMemo(() => {
        if (!selectedNodeId) return false;
        return tasks.some(t => t.parent_task_id === selectedNodeId);
    }, [selectedNodeId, tasks]);

    // Handle save task title
    const handleSaveTaskTitle = useCallback(async (taskId: string, newTitle: string) => {
        if (onUpdateTask && newTitle.trim()) {
            await onUpdateTask(taskId, { title: newTitle.trim() });
        }
    }, [onUpdateTask]);

    // Handle edit end
    const handleEditEnd = useCallback(() => {
        setEditingNodeId(null);
        // Re-focus container for keyboard shortcuts
        setTimeout(() => {
            containerRef.current?.focus();
        }, 0);
    }, []);

    // DERIVED STATE: nodes and edges
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
                selected: selectedNodeId === 'project-root',
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
                    selected: selectedNodeId === group.id,
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
                        data: {
                            label: task.title ?? 'Task',
                            status: task.status ?? 'todo',
                            isEditing: editingNodeId === task.id,
                            onSave: (newTitle: string) => handleSaveTaskTitle(task.id, newTitle),
                            onEditEnd: handleEditEnd,
                        },
                        position: { x: 520, y: taskYOffset },
                        selected: selectedNodeId === task.id,
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
                            data: {
                                label: child.title ?? 'Subtask',
                                status: child.status ?? 'todo',
                                isEditing: editingNodeId === child.id,
                                onSave: (newTitle: string) => handleSaveTaskTitle(child.id, newTitle),
                                onEditEnd: handleEditEnd,
                            },
                            position: { x: 720, y: taskYOffset },
                            selected: selectedNodeId === child.id,
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
    }, [projectId, groupsJson, tasksJson, project?.title, selectedNodeId, editingNodeId, handleSaveTaskTitle, handleEditEnd]);

    // Handle node click to select
    const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
        setSelectedNodeId(node.id);
    }, []);

    // Handle pane click to deselect
    const handlePaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setEditingNodeId(null);
    }, []);

    // KEYBOARD SHORTCUTS
    const handleKeyDown = useCallback(async (event: React.KeyboardEvent) => {
        // Skip if currently editing
        if (editingNodeId) return;

        // Skip if focus is on input/textarea
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
            return;
        }

        if (!selectedNodeId || !onCreateTask) return;
        if (selectedNodeId === 'project-root') return;

        const isGroupNode = groups.some(g => g.id === selectedNodeId);

        switch (event.key) {
            case 'Tab': {
                event.preventDefault();
                event.stopPropagation();

                if (isGroupNode) {
                    const newTask = await onCreateTask(selectedNodeId, "New Task", null);
                    if (newTask) {
                        setSelectedNodeId(newTask.id);
                        setEditingNodeId(newTask.id); // Auto-edit mode
                    }
                } else if (selectedTask && selectedGroup) {
                    const newTask = await onCreateTask(selectedGroup.id, "New Subtask", selectedNodeId);
                    if (newTask) {
                        setSelectedNodeId(newTask.id);
                        setEditingNodeId(newTask.id); // Auto-edit mode
                    }
                }
                break;
            }

            case 'Enter': {
                if (event.nativeEvent.isComposing) return;

                event.preventDefault();
                event.stopPropagation();

                if (isGroupNode) return;

                if (selectedTask && selectedGroup) {
                    const newTask = await onCreateTask(
                        selectedGroup.id,
                        "New Task",
                        selectedTask.parent_task_id
                    );
                    if (newTask) {
                        setSelectedNodeId(newTask.id);
                        setEditingNodeId(newTask.id); // Auto-edit mode
                    }
                }
                break;
            }

            case 'F2': {
                // F2 to edit selected node
                event.preventDefault();
                if (!isGroupNode && selectedNodeId) {
                    setEditingNodeId(selectedNodeId);
                }
                break;
            }

            case 'Backspace':
            case 'Delete': {
                event.preventDefault();
                event.stopPropagation();

                if (isGroupNode || !onDeleteTask) return;

                if (selectedNodeHasChildren) {
                    const confirmed = window.confirm(
                        '子タスクを含むタスクを削除しますか？\nすべての子タスクも削除されます。'
                    );
                    if (!confirmed) return;
                }

                await onDeleteTask(selectedNodeId);
                setSelectedNodeId(null);
                break;
            }

            case 'Escape': {
                setSelectedNodeId(null);
                setEditingNodeId(null);
                break;
            }
        }
    }, [selectedNodeId, selectedTask, selectedGroup, selectedNodeHasChildren, groups, onCreateTask, onDeleteTask, editingNodeId]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-muted/5 relative"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                defaultViewport={defaultViewport}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
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
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="rgba(255, 255, 255, 0.15)"
                />
                <Controls showInteractive={false} />
            </ReactFlow>

            {/* Keyboard shortcut hint */}
            {selectedNodeId && selectedNodeId !== 'project-root' && !editingNodeId && (
                <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur border rounded-lg p-2 text-xs text-muted-foreground shadow-lg">
                    <div className="flex gap-4">
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Tab</kbd> 子タスク</span>
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> 兄弟タスク</span>
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F2</kbd> 編集</span>
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Del</kbd> 削除</span>
                    </div>
                </div>
            )}
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
