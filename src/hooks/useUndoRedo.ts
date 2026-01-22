import { useState, useCallback, useRef, useEffect } from 'react';

interface HistoryState<T> {
    state: T;
    timestamp: number;
}

export function useUndoRedo<T>(initialState: T, maxHistorySize: number = 50) {
    const [currentState, setCurrentState] = useState<T>(initialState);
    const [history, setHistory] = useState<HistoryState<T>[]>([{ state: initialState, timestamp: Date.now() }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const isUndoRedoRef = useRef(false);

    // Update current state when initial state changes (from external source)
    useEffect(() => {
        if (!isUndoRedoRef.current) {
            setCurrentState(initialState);
            // Reset history if external state changes (e.g., page reload)
            setHistory([{ state: initialState, timestamp: Date.now() }]);
            setHistoryIndex(0);
        }
        isUndoRedoRef.current = false;
    }, [initialState]);

    // Save state to history before making changes
    const saveToHistory = useCallback((newState: T, skipIfSame: boolean = true) => {
        if (isUndoRedoRef.current) return; // Don't save during undo/redo

        // Skip if state hasn't changed (deep comparison would be expensive, so we rely on caller)
        if (skipIfSame && JSON.stringify(currentState) === JSON.stringify(newState)) {
            return;
        }

        setHistory(prev => {
            // Remove any "future" history if we're not at the end
            const newHistory = prev.slice(0, historyIndex + 1);
            
            // Add new state
            newHistory.push({ state: newState, timestamp: Date.now() });
            
            // Limit history size
            if (newHistory.length > maxHistorySize) {
                newHistory.shift();
            } else {
                return newHistory;
            }
            
            return newHistory;
        });
        
        setHistoryIndex(prev => {
            const newIndex = prev + 1;
            return newIndex >= maxHistorySize ? maxHistorySize - 1 : newIndex;
        });
        
        setCurrentState(newState);
    }, [historyIndex, maxHistorySize, currentState]);

    // Undo: Go back to previous state
    const undo = useCallback(() => {
        if (historyIndex <= 0) return false; // No history to undo
        
        isUndoRedoRef.current = true;
        const prevIndex = historyIndex - 1;
        const prevState = history[prevIndex];
        
        setHistoryIndex(prevIndex);
        setCurrentState(prevState.state);
        
        return true;
    }, [history, historyIndex]);

    // Redo: Go forward to next state
    const redo = useCallback(() => {
        if (historyIndex >= history.length - 1) return false; // No future to redo
        
        isUndoRedoRef.current = true;
        const nextIndex = historyIndex + 1;
        const nextState = history[nextIndex];
        
        setHistoryIndex(nextIndex);
        setCurrentState(nextState.state);
        
        return true;
    }, [history, historyIndex]);

    // Check if undo/redo is possible
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    return {
        state: currentState,
        setState: saveToHistory,
        undo,
        redo,
        canUndo,
        canRedo,
        historyLength: history.length,
        historyIndex
    };
}
