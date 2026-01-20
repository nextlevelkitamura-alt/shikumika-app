"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// Action interface for Command Pattern
export interface HistoryAction {
    type: 'CREATE_TASK' | 'DELETE_TASK' | 'UPDATE_TASK' | 'CREATE_GROUP' | 'DELETE_GROUP' | 'UPDATE_GROUP';
    description: string;
    // Execute the action (for redo)
    execute: () => Promise<void>;
    // Reverse the action (for undo)
    reverse: () => Promise<void>;
}

interface HistoryContextType {
    // Can undo/redo
    canUndo: boolean;
    canRedo: boolean;

    // Actions
    record: (action: HistoryAction) => void;
    undo: () => Promise<void>;
    redo: () => Promise<void>;

    // Clear history
    clear: () => void;

    // Last action description (for UI feedback)
    lastAction: string | null;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

export function useHistory() {
    const context = useContext(HistoryContext);
    if (!context) {
        throw new Error('useHistory must be used within a HistoryProvider');
    }
    return context;
}

// Optional hook that doesn't throw if context is missing
export function useHistoryOptional() {
    return useContext(HistoryContext);
}

const MAX_HISTORY_SIZE = 50;

export function HistoryProvider({ children }: { children: React.ReactNode }) {
    // Past actions stack (for undo)
    const [past, setPast] = useState<HistoryAction[]>([]);
    // Future actions stack (for redo)
    const [future, setFuture] = useState<HistoryAction[]>([]);
    // Last action description
    const [lastAction, setLastAction] = useState<string | null>(null);

    // Prevent concurrent undo/redo operations
    const isProcessingRef = useRef(false);

    // Record a new action
    const record = useCallback((action: HistoryAction) => {
        setPast(prev => {
            const newPast = [...prev, action];
            // Limit history size
            if (newPast.length > MAX_HISTORY_SIZE) {
                return newPast.slice(-MAX_HISTORY_SIZE);
            }
            return newPast;
        });
        // Clear future when new action is recorded
        setFuture([]);
        setLastAction(action.description);
    }, []);

    // Undo the last action
    const undo = useCallback(async () => {
        if (past.length === 0 || isProcessingRef.current) return;

        isProcessingRef.current = true;

        try {
            const lastAction = past[past.length - 1];

            // Execute the reverse action
            await lastAction.reverse();

            // Move from past to future
            setPast(prev => prev.slice(0, -1));
            setFuture(prev => [...prev, lastAction]);
            setLastAction(`Undo: ${lastAction.description}`);
        } catch (error) {
            console.error('[History] Undo failed:', error);
        } finally {
            isProcessingRef.current = false;
        }
    }, [past]);

    // Redo the last undone action
    const redo = useCallback(async () => {
        if (future.length === 0 || isProcessingRef.current) return;

        isProcessingRef.current = true;

        try {
            const nextAction = future[future.length - 1];

            // Execute the action again
            await nextAction.execute();

            // Move from future to past
            setFuture(prev => prev.slice(0, -1));
            setPast(prev => [...prev, nextAction]);
            setLastAction(`Redo: ${nextAction.description}`);
        } catch (error) {
            console.error('[History] Redo failed:', error);
        } finally {
            isProcessingRef.current = false;
        }
    }, [future]);

    // Clear all history
    const clear = useCallback(() => {
        setPast([]);
        setFuture([]);
        setLastAction(null);
    }, []);

    return (
        <HistoryContext.Provider value={{
            canUndo: past.length > 0,
            canRedo: future.length > 0,
            record,
            undo,
            redo,
            clear,
            lastAction
        }}>
            {children}
        </HistoryContext.Provider>
    );
}
