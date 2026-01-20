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
import dagre from 'dagre';
import { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

// --- Dagre Layout Function ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const NODE_WIDTH = 150;
const NODE_HEIGHT = 40;
const PROJECT_NODE_WIDTH = 200;
const PROJECT_NODE_HEIGHT = 60;
const GROUP_NODE_WIDTH = 160;
const GROUP_NODE_HEIGHT = 50;

function getLayoutedElements(nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } {
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 200 });

    nodes.forEach((node) => {
        let width = NODE_WIDTH;
        let height = NODE_HEIGHT;

        if (node.type === 'projectNode') {
            width = PROJECT_NODE_WIDTH;
            height = PROJECT_NODE_HEIGHT;
        } else if (node.type === 'groupNode') {
            width = GROUP_NODE_WIDTH;
            height = GROUP_NODE_HEIGHT;
        }

        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        let width = NODE_WIDTH;
        let height = NODE_HEIGHT;

        if (node.type === 'projectNode') {
            width = PROJECT_NODE_WIDTH;
            height = PROJECT_NODE_HEIGHT;
        } else if (node.type === 'groupNode') {
            width = GROUP_NODE_WIDTH;
            height = GROUP_NODE_HEIGHT;
        }

        return {
            ...node,
            position: {
                x: nodeWithPosition.x - width / 2,
                y: nodeWithPosition.y - height / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
}

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

// TASK NODE
const TaskNode = React.memo(({ data, selected }: NodeProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editValue, setEditValue] = useState<string>(data?.label ?? '');

    // Trigger edit from external
    useEffect(() => {
        if (data?.triggerEdit && !isEditing) {
            setIsEditing(true);
            setEditValue(data?.initialValue ?? '');
        }
    }, [data?.triggerEdit, data?.initialValue, isEditing]);

    // Sync label
    useEffect(() => {
        if (!isEditing) {
            setEditValue(data?.label ?? '');
        }
    }, [data?.label, isEditing]);

    // Auto-focus input
    useEffect(() => {
        if (isEditing && inputRef.current) {
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                inputRef.current?.focus();
                const len = inputRef.current?.value.length ?? 0;
                inputRef.current?.setSelectionRange(len, len);
            });
        }
    }, [isEditing]);

    // Auto-focus wrapper when selected
    useEffect(() => {
        if (selected && !isEditing && wrapperRef.current) {
            wrapperRef.current.focus();
        }
    }, [selected, isEditing]);

    const saveValue = useCallback(async () => {
        const trimmed = editValue.trim() || 'Task';
        if (trimmed !== data?.label && data?.onSave) {
            await data.onSave(trimmed);
        }
        return trimmed;
    }, [editValue, data]);

    const exitEditMode = useCallback(() => {
        setIsEditing(false);
        requestAnimationFrame(() => {
            wrapperRef.current?.focus();
        });
    }, []);

    const handleInputKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();

        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            await saveValue();
            setIsEditing(false);
            // Trigger sibling creation
            if (data?.onAddSibling) {
                await data.onAddSibling();
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            await saveValue();
            setIsEditing(false);
            // Trigger child creation
            if (data?.onAddChild) {
                await data.onAddChild();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditValue(data?.label ?? '');
            exitEditMode();
        }
    }, [saveValue, exitEditMode, data]);

    const handleWrapperKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isEditing) return;

        e.stopPropagation();

        if (e.key === 'Tab') {
            e.preventDefault();
            if (data?.onAddChild) await data.onAddChild();
        } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (data?.onAddSibling) await data.onAddSibling();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            if (data?.onDelete) await data.onDelete();
        } else if (e.key === 'F2') {
            e.preventDefault();
            setIsEditing(true);
            setEditValue(data?.label ?? '');
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            setIsEditing(true);
            setEditValue(e.key);
        }
    }, [isEditing, data]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditValue(data?.label ?? '');
    }, [data?.label]);

    const handleInputBlur = useCallback(async () => {
        await saveValue();
        setIsEditing(false);
    }, [saveValue]);

    return (
        <div
            ref={wrapperRef}
            className={cn(
                "w-[140px] px-2 py-1.5 rounded bg-background border text-xs shadow-sm flex items-center gap-1 transition-all outline-none",
                selected && "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary"
            )}
            tabIndex={0}
            onKeyDown={handleWrapperKeyDown}
            onDoubleClick={handleDoubleClick}
        >
            <Handle type="target" position={Position.Left} className="!bg-muted-foreground/50 !w-1 !h-1" />
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", data?.status === 'done' ? "bg-primary" : "bg-muted-foreground/30")} />

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
                <span className={cn("flex-1 truncate px-0.5", data?.status === 'done' && "line-through text-muted-foreground")}>
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
        parent_task_id: t?.parent_task_id,
        order_index: t?.order_index,
        created_at: t?.created_at
    })) ?? []);

    // STATE
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [pendingEditNodeId, setPendingEditNodeId] = useState<string | null>(null);

    // REF: Flag to indicate we're waiting for a new node
    const isCreatingNodeRef = useRef(false);
    const prevTaskCountRef = useRef(tasks.length);

    // REF: Focus queue - persists through dagre re-layouts
    const focusQueueRef = useRef<string | null>(null);
    const focusAttemptRef = useRef(0);

    // EFFECT: Detect new task and queue focus
    useEffect(() => {
        const currentCount = tasks.length;
        const prevCount = prevTaskCountRef.current;

        // Check if a new task was added while we were creating
        if (isCreatingNodeRef.current && currentCount > prevCount) {
            // Find the newest task by created_at
            const newestTask = tasks.reduce((newest, task) => {
                if (!newest) return task;
                const newestDate = new Date(newest.created_at).getTime();
                const taskDate = new Date(task.created_at).getTime();
                return taskDate > newestDate ? task : newest;
            }, null as Task | null);

            if (newestTask) {
                console.log('[MindMap] New task detected, queuing focus:', newestTask.id);
                // Queue for focus - this persists through dagre re-layout
                focusQueueRef.current = newestTask.id;
                focusAttemptRef.current = 0;
                setSelectedNodeId(newestTask.id);
                setPendingEditNodeId(newestTask.id);
            }

            // Reset the flag
            isCreatingNodeRef.current = false;
        }

        // Update prev count
        prevTaskCountRef.current = currentCount;
    }, [tasks]);

    // EFFECT: Restore focus after dagre layout (triggered by pendingEditNodeId)
    useEffect(() => {
        if (pendingEditNodeId && focusQueueRef.current) {
            // Wait for dagre layout to complete, then trigger focus
            const timer = setTimeout(() => {
                // Re-set pendingEditNodeId to trigger TaskNode's triggerEdit
                if (focusQueueRef.current && focusAttemptRef.current < 3) {
                    focusAttemptRef.current++;
                    setPendingEditNodeId(focusQueueRef.current);
                }
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [pendingEditNodeId]);

    // EFFECT: Clear focus queue after successful focus (longer timeout)
    useEffect(() => {
        if (pendingEditNodeId) {
            const timer = setTimeout(() => {
                focusQueueRef.current = null;
                focusAttemptRef.current = 0;
                setPendingEditNodeId(null);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [pendingEditNodeId]);

    // Helpers
    const getTaskById = useCallback((id: string) => tasks.find(t => t.id === id), [tasks]);
    const getGroupForTask = useCallback((task: Task) => groups.find(g => g.id === task.group_id), [groups]);
    const hasChildren = useCallback((taskId: string) => tasks.some(t => t.parent_task_id === taskId), [tasks]);

    const calculateNextFocus = useCallback((taskId: string): string | null => {
        const task = getTaskById(taskId);
        if (!task) return null;

        const allSiblings = tasks
            .filter(t => t.group_id === task.group_id && t.parent_task_id === task.parent_task_id)
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

        const currentIndex = allSiblings.findIndex(t => t.id === taskId);

        if (currentIndex > 0) return allSiblings[currentIndex - 1].id;
        if (currentIndex < allSiblings.length - 1) return allSiblings[currentIndex + 1].id;
        if (task.parent_task_id) return task.parent_task_id;
        return task.group_id;
    }, [tasks, getTaskById]);

    // Add child task
    const addChildTask = useCallback(async (parentTaskId: string) => {
        const parentTask = getTaskById(parentTaskId);
        if (!parentTask || !onCreateTask) return;
        const group = getGroupForTask(parentTask);
        if (!group) return;

        // Set flag BEFORE creating
        isCreatingNodeRef.current = true;

        await onCreateTask(group.id, "", parentTaskId);
    }, [getTaskById, getGroupForTask, onCreateTask]);

    // Add sibling task
    const addSiblingTask = useCallback(async (taskId: string) => {
        const task = getTaskById(taskId);
        if (!task || !onCreateTask) return;
        const group = getGroupForTask(task);
        if (!group) return;

        // Set flag BEFORE creating
        isCreatingNodeRef.current = true;

        await onCreateTask(group.id, "", task.parent_task_id);
    }, [getTaskById, getGroupForTask, onCreateTask]);

    // Delete task
    const deleteTask = useCallback(async (taskId: string) => {
        if (!onDeleteTask) return;

        if (hasChildren(taskId)) {
            const confirmed = window.confirm('子タスクを含むタスクを削除しますか？\nすべての子タスクも削除されます。');
            if (!confirmed) return;
        }

        const nextFocusId = calculateNextFocus(taskId);
        await onDeleteTask(taskId);
        setSelectedNodeId(nextFocusId);
    }, [hasChildren, calculateNextFocus, onDeleteTask]);

    // Save task title
    const saveTaskTitle = useCallback(async (taskId: string, newTitle: string) => {
        if (onUpdateTask && newTitle.trim()) {
            await onUpdateTask(taskId, { title: newTitle.trim() });
        }
    }, [onUpdateTask]);

    // Check if node should trigger edit
    const shouldTriggerEdit = useCallback((taskId: string) => pendingEditNodeId === taskId, [pendingEditNodeId]);

    // DERIVED STATE
    const { nodes, edges } = useMemo(() => {
        const resultNodes: Node[] = [];
        const resultEdges: Edge[] = [];

        if (!projectId) return { nodes: resultNodes, edges: resultEdges };

        try {
            const parsedGroups = JSON.parse(groupsJson) as { id: string; title: string }[];
            const parsedTasks = JSON.parse(tasksJson) as {
                id: string; title: string; status: string; group_id: string;
                parent_task_id: string | null; order_index: number; created_at: string;
            }[];

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

            // Build child tasks map
            const childTasksByParent: Record<string, typeof safeTasks> = {};
            for (const task of safeTasks) {
                if (task.parent_task_id) {
                    if (!childTasksByParent[task.parent_task_id]) childTasksByParent[task.parent_task_id] = [];
                    childTasksByParent[task.parent_task_id].push(task);
                }
            }
            for (const key of Object.keys(childTasksByParent)) {
                childTasksByParent[key].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
            }

            // Root tasks (no parent)
            const rootTasks = safeTasks.filter(t => !t.parent_task_id).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

            const rootTasksByGroup: Record<string, typeof safeTasks> = {};
            for (const task of rootTasks) {
                if (!rootTasksByGroup[task.group_id]) rootTasksByGroup[task.group_id] = [];
                rootTasksByGroup[task.group_id].push(task);
            }

            // Recursive function to render tasks (max 6 levels)
            const MAX_DEPTH = 6;
            const BASE_X = 520;
            const X_STEP = 180;

            const renderTasksRecursively = (
                task: typeof safeTasks[0],
                parentId: string,
                depth: number,
                yOffsetRef: { current: number }
            ) => {
                if (depth >= MAX_DEPTH) return;

                const triggerEdit = shouldTriggerEdit(task.id);
                const xPos = BASE_X + (depth * X_STEP);

                resultNodes.push({
                    id: task.id,
                    type: 'taskNode',
                    data: {
                        label: task.title ?? 'Task',
                        status: task.status ?? 'todo',
                        triggerEdit,
                        initialValue: '',
                        onSave: (t: string) => saveTaskTitle(task.id, t),
                        onAddChild: () => addChildTask(task.id),
                        onAddSibling: () => addSiblingTask(task.id),
                        onDelete: () => deleteTask(task.id),
                    },
                    position: { x: xPos, y: yOffsetRef.current },
                    selected: selectedNodeId === task.id,
                });
                resultEdges.push({
                    id: `e-${parentId}-${task.id}`,
                    source: parentId,
                    target: task.id,
                    type: 'smoothstep'
                });

                yOffsetRef.current += 40;

                // Render children recursively
                const children = childTasksByParent[task.id] ?? [];
                for (const child of children) {
                    renderTasksRecursively(child, task.id, depth + 1, yOffsetRef);
                }
            };

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
                resultEdges.push({ id: `e-proj-${group.id}`, source: 'project-root', target: group.id, type: 'smoothstep' });

                const groupRootTasks = rootTasksByGroup[group.id] ?? [];
                const yOffsetRef = { current: groupY - 20 };

                for (const task of groupRootTasks) {
                    renderTasksRecursively(task, group.id, 0, yOffsetRef);
                }

                globalYOffset = Math.max(globalYOffset + 80, yOffsetRef.current + 30);
            });
        } catch (err) {
            console.error('[MindMap] Error:', err);
        }

        // Apply dagre layout to get optimal positions
        return getLayoutedElements(resultNodes, resultEdges);
    }, [projectId, groupsJson, tasksJson, project?.title, selectedNodeId, shouldTriggerEdit, saveTaskTitle, addChildTask, addSiblingTask, deleteTask]);

    const handleNodeClick: NodeMouseHandler = useCallback((_, node) => setSelectedNodeId(node.id), []);
    const handlePaneClick = useCallback(() => setSelectedNodeId(null), []);

    const handleContainerKeyDown = useCallback(async (event: React.KeyboardEvent) => {
        if (!selectedNodeId) return;
        const isGroupNode = groups.some(g => g.id === selectedNodeId);
        if (!isGroupNode) return;

        if (event.key === 'Tab') {
            event.preventDefault();
            if (onCreateTask) {
                isCreatingNodeRef.current = true;
                await onCreateTask(selectedNodeId, "", null);
            }
        }
    }, [selectedNodeId, groups, onCreateTask]);

    return (
        <div className="w-full h-full bg-muted/5 relative outline-none" tabIndex={0} onKeyDown={handleContainerKeyDown}>
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
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255, 255, 255, 0.15)" />
                <Controls showInteractive={false} />
            </ReactFlow>

            {selectedNodeId && selectedNodeId !== 'project-root' && (
                <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur border rounded-lg p-2 text-xs text-muted-foreground shadow-lg">
                    <div className="flex gap-3">
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Tab</kbd> 子追加</span>
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> 兄弟追加</span>
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
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return <div className="w-full h-full bg-muted/5 flex items-center justify-center text-muted-foreground">Loading...</div>;

    return (
        <MindMapErrorBoundary>
            <ReactFlowProvider>
                <MindMapContent {...props} />
            </ReactFlowProvider>
        </MindMapErrorBoundary>
    );
}
