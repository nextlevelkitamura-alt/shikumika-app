"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type Task = Database['public']['Tables']['tasks']['Row']
type TaskGroup = Database['public']['Tables']['task_groups']['Row']

interface TaskItem {
    id: string
    title: string
    indent: number // 0 = root, 1 = child, 2 = grandchild, etc.
    groupId: string
    parentTaskId: string | null
    status: string
    isNew?: boolean
}

interface TaskListProps {
    tasks: Task[]
    groups: TaskGroup[]
    projectId: string
    onCreateTask: (groupId: string, title: string, parentTaskId: string | null) => Promise<Task | null>
    onUpdateTask: (taskId: string, title: string) => Promise<void>
    onDeleteTask: (taskId: string) => Promise<void>
    onTaskFocus?: (taskId: string) => void
}

export default function TaskList({
    tasks,
    groups,
    projectId,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
    onTaskFocus,
}: TaskListProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Build flat list with indentation
    const flatList = React.useMemo(() => {
        const result: TaskItem[] = [];

        groups.forEach(group => {
            const groupTasks = tasks.filter(t => t.group_id === group.id);

            const addTasks = (parentId: string | null, indent: number) => {
                const children = groupTasks
                    .filter(t => t.parent_task_id === parentId)
                    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

                children.forEach(task => {
                    result.push({
                        id: task.id,
                        title: task.title || '',
                        indent,
                        groupId: group.id,
                        parentTaskId: task.parent_task_id,
                        status: task.status || 'pending',
                    });
                    addTasks(task.id, indent + 1);
                });
            };

            // Add group header
            result.push({
                id: `group-${group.id}`,
                title: group.title || 'グループ',
                indent: -1, // Special: group header
                groupId: group.id,
                parentTaskId: null,
                status: 'group',
            });

            addTasks(null, 0);
        });

        return result;
    }, [tasks, groups]);

    // Debounced save
    const debouncedSave = useCallback((taskId: string, title: string) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            await onUpdateTask(taskId, title);
        }, 1500);
    }, [onUpdateTask]);

    // Handle key events
    const handleKeyDown = useCallback(async (
        e: React.KeyboardEvent<HTMLInputElement>,
        item: TaskItem,
        index: number
    ) => {
        if (e.nativeEvent.isComposing) return; // IME composing

        if (e.key === 'Enter') {
            e.preventDefault();

            // Save current
            if (editValue.trim()) {
                debouncedSave(item.id, editValue.trim());
            }

            // Create sibling
            const newTask = await onCreateTask(item.groupId, '', item.parentTaskId);
            if (newTask) {
                setEditingId(newTask.id);
                setEditValue('');
                // Focus will be handled by useEffect
            }
        } else if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();

            // Save current
            if (editValue.trim()) {
                debouncedSave(item.id, editValue.trim());
            }

            // Create child
            const newTask = await onCreateTask(item.groupId, '', item.id);
            if (newTask) {
                setEditingId(newTask.id);
                setEditValue('');
            }
        } else if (e.key === 'Backspace' && editValue === '') {
            e.preventDefault();

            // Delete empty task
            await onDeleteTask(item.id);

            // Focus previous
            if (index > 0) {
                const prevItem = flatList[index - 1];
                if (prevItem && !prevItem.id.startsWith('group-')) {
                    setEditingId(prevItem.id);
                    setEditValue(prevItem.title);
                }
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditingId(null);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            // Move to previous task
            for (let i = index - 1; i >= 0; i--) {
                if (!flatList[i].id.startsWith('group-')) {
                    setEditingId(flatList[i].id);
                    setEditValue(flatList[i].title);
                    break;
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            // Move to next task
            for (let i = index + 1; i < flatList.length; i++) {
                if (!flatList[i].id.startsWith('group-')) {
                    setEditingId(flatList[i].id);
                    setEditValue(flatList[i].title);
                    break;
                }
            }
        }
    }, [editValue, debouncedSave, onCreateTask, onDeleteTask, flatList]);

    // Auto-focus when editing changes
    useEffect(() => {
        if (editingId) {
            const input = inputRefs.current.get(editingId);
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }
    }, [editingId]);

    // Click to edit
    const handleItemClick = (item: TaskItem) => {
        if (item.id.startsWith('group-')) return;
        setEditingId(item.id);
        setEditValue(item.title);
        onTaskFocus?.(item.id);
    };

    return (
        <div className="h-full overflow-y-auto bg-background p-4">
            <h2 className="text-lg font-semibold mb-4 text-foreground">タスクリスト</h2>
            <div className="space-y-1">
                {flatList.map((item, index) => {
                    const isGroup = item.id.startsWith('group-');
                    const isEditing = editingId === item.id;

                    if (isGroup) {
                        return (
                            <div key={item.id} className="font-medium text-sm text-muted-foreground pt-4 pb-1 border-b border-border">
                                {item.title}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-text",
                                isEditing && "bg-muted"
                            )}
                            style={{ paddingLeft: `${item.indent * 20 + 8}px` }}
                            onClick={() => handleItemClick(item)}
                        >
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                item.status === 'done' ? "bg-primary" : "bg-muted-foreground/30"
                            )} />

                            {isEditing ? (
                                <input
                                    ref={(el) => { if (el) inputRefs.current.set(item.id, el); }}
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, item, index)}
                                    onBlur={() => {
                                        if (editValue.trim() && editValue !== item.title) {
                                            debouncedSave(item.id, editValue.trim());
                                        }
                                        setEditingId(null);
                                    }}
                                    className="flex-1 bg-transparent border-none outline-none text-sm"
                                    placeholder="タスクを入力..."
                                />
                            ) : (
                                <span className={cn(
                                    "flex-1 text-sm",
                                    !item.title && "text-muted-foreground"
                                )}>
                                    {item.title || 'タスクを入力...'}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
