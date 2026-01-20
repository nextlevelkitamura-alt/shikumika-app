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

// TASK NODE: Supports Selection Mode (text) and Edit Mode (input)
const TaskNode = React.memo(({ data, selected }: NodeProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editValue, setEditValue] = useState<string>(data?.label ?? '');

    // Handle external trigger to enter edit mode (for new nodes)
    useEffect(() => {
        if (data?.triggerEdit) {
            setIsEditing(true);
            setEditValue(data?.initialValue ?? data?.label ?? '');
            // Clear the trigger after handling
            if (data?.onTriggerHandled) {
                data.onTriggerHandled();
            }
        }
    }, [data?.triggerEdit, data?.initialValue, data?.label, data?.onTriggerHandled]);

    // Sync label when not editing
    useEffect(() => {
        if (!isEditing) {
            setEditValue(data?.label ?? '');
        }
    }, [data?.label, isEditing]);

    // Auto-focus when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Handle double-click to enter edit mode
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    }, []);

    // Handle blur - save and exit edit mode
    const handleInputBlur = useCallback(() => {
        const trimmed = editValue.trim() || data?.label || 'Task';
        setIsEditing(false);
        if (trimmed !== data?.label && data?.onSave) {
            data.onSave(trimmed);
        }
        // Notify parent to refocus container
        if (data?.onEditComplete) {
            data.onEditComplete();
        }
    }, [editValue, data]);

    // Handle input keydown - Enter to save, Escape to cancel
    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        // CRITICAL: Stop propagation to prevent parent shortcuts
        e.stopPropagation();

        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            inputRef.current?.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditValue(data?.label ?? '');
            setIsEditing(false);
            if (data?.onEditComplete) {
                data.onEditComplete();
            }
        } else if (e.key === 'Tab') {
            // Prevent Tab from moving focus while editing
            e.preventDefault();
        }
    }, [data]);

    return (
        <div
            className={cn(
                "w-[140px] px-2 py-1.5 rounded bg-background border text-xs shadow-sm flex items-center gap-1 transition-all",
                selected && "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary"
            )}
            onDoubleClick={handleDoubleClick}
        >
            <Handle type="target" position={Position.Left} className="!bg-muted-foreground/50 !w-1 !h-1" />

            {/* Status indicator */}
            <div className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                data?.status === 'done' ? "bg-primary" : "bg-muted-foreground/30"
            )} />

            {/* EDIT MODE: Input */}
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="nodrag nopan flex-1 bg-transparent border-none text-xs focus:outline-none focus:ring-0 px-0.5 min-w-0"
                    autoFocus
                />
            ) : (
                /* SELECTION MODE: Text display */
                <span
                    className={cn(
                        "flex-1 truncate px-0.5",
                        data?.status === 'done' && "line-through text-muted-foreground"
                    )}
                >
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

    // STATE
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [pendingEditNodeId, setPendingEditNodeId] = useState<string | null>(null);
    const [pendingInitialValue, setPendingInitialValue] = useState<string>('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Focus container when edit completes
    const refocusContainer = useCallback(() => {
        setTimeout(() => {
            containerRef.current?.focus();
        }, 10);
    }, []);

    // Clear pending edit after it's been handled by the node
    const handleTriggerHandled = useCallback(() => {
        setPendingEditNodeId(null);
        setPendingInitialValue('');
    }, []);

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
                    const shouldTriggerEdit = pendingEditNodeId === task.id;

                    resultNodes.push({
                        id: task.id,
                        type: 'taskNode',
                        data: {
                            label: task.title ?? 'Task',
                            status: task.status ?? 'todo',
                            triggerEdit: shouldTriggerEdit,
                            initialValue: shouldTriggerEdit ? pendingInitialValue : undefined,
                            onTriggerHandled: handleTriggerHandled,
                            onSave: (newTitle: string) => handleSaveTaskTitle(task.id, newTitle),
                            onEditComplete: refocusContainer,
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
                        const shouldTriggerChildEdit = pendingEditNodeId === child.id;

                        resultNodes.push({
                            id: child.id,
                            type: 'taskNode',
                            data: {
                                label: child.title ?? 'Subtask',
                                status: child.status ?? 'todo',
                                triggerEdit: shouldTriggerChildEdit,
                                initialValue: shouldTriggerChildEdit ? pendingInitialValue : undefined,
                                onTriggerHandled: handleTriggerHandled,
                                onSave: (newTitle: string) => handleSaveTaskTitle(child.id, newTitle),
                                onEditComplete: refocusContainer,
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
    }, [projectId, groupsJson, tasksJson, project?.title, selectedNodeId, pendingEditNodeId, pendingInitialValue, handleSaveTaskTitle, handleTriggerHandled, refocusContainer]);

    // Handle node click to select
    const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
        setSelectedNodeId(node.id);
    }, []);

    // Handle pane click to deselect
    const handlePaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    // Check if currently in edit mode (any node being edited)
    const isAnyNodeEditing = pendingEditNodeId !== null;

    // KEYBOARD SHORTCUTS - Only active in Selection Mode
    const handleKeyDown = useCallback(async (event: React.KeyboardEvent) => {
        // If focus is on input/textarea, don't handle shortcuts
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
            return;
        }

        if (!selectedNodeId || !onCreateTask) return;
        if (selectedNodeId === 'project-root') return;

        const isGroupNode = groups.some(g => g.id === selectedNodeId);
        const isTaskNode = !isGroupNode && tasks.some(t => t.id === selectedNodeId);

        // Handle shortcuts
        switch (event.key) {
            case 'Tab': {
                event.preventDefault();
                event.stopPropagation();

                if (isGroupNode) {
                    // Tab on group = create new root task in this group
                    const newTask = await onCreateTask(selectedNodeId, "", null);
                    if (newTask) {
                        setSelectedNodeId(newTask.id);
                        setPendingEditNodeId(newTask.id);
                        setPendingInitialValue('');
                    }
                } else if (selectedTask && selectedGroup) {
                    // Tab on task = create child task
                    const newTask = await onCreateTask(selectedGroup.id, "", selectedNodeId);
                    if (newTask) {
                        setSelectedNodeId(newTask.id);
                        setPendingEditNodeId(newTask.id);
                        setPendingInitialValue('');
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
                    // Enter = create sibling task (same parent)
                    const newTask = await onCreateTask(
                        selectedGroup.id,
                        "",
                        selectedTask.parent_task_id
                    );
                    if (newTask) {
                        setSelectedNodeId(newTask.id);
                        setPendingEditNodeId(newTask.id);
                        setPendingInitialValue('');
                    }
                }
                break;
            }

            case 'F2': {
                // F2 to edit selected node
                event.preventDefault();
                if (isTaskNode) {
                    setPendingEditNodeId(selectedNodeId);
                    setPendingInitialValue(selectedTask?.title ?? '');
                }
                break;
            }

            case 'Backspace':
            case 'Delete': {
                event.preventDefault();
                event.stopPropagation();

                if (!isTaskNode || !onDeleteTask) return;

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
                break;
            }

            default: {
                // If it's a printable character, enter edit mode with that character
                if (isTaskNode && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                    event.preventDefault();
                    setPendingEditNodeId(selectedNodeId);
                    setPendingInitialValue(event.key); // Start with the typed character
                }
            }
        }
    }, [selectedNodeId, selectedTask, selectedGroup, selectedNodeHasChildren, groups, tasks, onCreateTask, onDeleteTask]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-muted/5 relative outline-none"
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

            {/* Keyboard shortcut hint - only show in selection mode */}
            {selectedNodeId && selectedNodeId !== 'project-root' && !pendingEditNodeId && (
                <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur border rounded-lg p-2 text-xs text-muted-foreground shadow-lg">
                    <div className="flex gap-3">
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Tab</kbd> 子</span>
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> 兄弟</span>
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">文字</kbd> 編集</span>
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
