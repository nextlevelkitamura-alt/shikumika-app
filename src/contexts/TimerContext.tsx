"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Database } from '@/types/database';

type Task = Database['public']['Tables']['tasks']['Row'];

interface TimerContextType {
    // Current running task
    runningTaskId: string | null;
    runningTask: Task | null;

    // Calculated elapsed time (updates every second)
    currentElapsedSeconds: number;

    // Actions
    startTimer: (task: Task) => Promise<void>;
    pauseTimer: () => Promise<void>;
    completeTimer: () => Promise<void>;
    interruptTimer: () => Promise<void>;

    // Loading state
    isLoading: boolean;
}

const TimerContext = createContext<TimerContextType | null>(null);

export function useTimer() {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
}

interface TimerProviderProps {
    children: React.ReactNode;
    tasks: Task[];
    onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

export function TimerProvider({ children, tasks, onUpdateTask }: TimerProviderProps) {
    const supabase = createClient();
    const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
    const [currentElapsedSeconds, setCurrentElapsedSeconds] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Find the running task from tasks array
    const runningTask = tasks.find(t => t.id === runningTaskId) ?? null;

    // Initialize: find any running timer on mount
    useEffect(() => {
        const runningTask = tasks.find(t => t.is_timer_running === true);
        if (runningTask) {
            setRunningTaskId(runningTask.id);
        }
    }, [tasks]);

    // Update elapsed time every second when timer is running
    useEffect(() => {
        if (runningTask && runningTask.is_timer_running && runningTask.last_started_at) {
            // Calculate initial elapsed
            const startTime = new Date(runningTask.last_started_at).getTime();
            const baseSeconds = runningTask.total_elapsed_seconds ?? 0;

            const updateElapsed = () => {
                const now = Date.now();
                const additionalSeconds = Math.floor((now - startTime) / 1000);
                setCurrentElapsedSeconds(baseSeconds + additionalSeconds);
            };

            updateElapsed(); // Initial update

            intervalRef.current = setInterval(updateElapsed, 1000);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        } else if (runningTask) {
            // Timer exists but not running - show stored time
            setCurrentElapsedSeconds(runningTask.total_elapsed_seconds ?? 0);
        } else {
            setCurrentElapsedSeconds(0);
        }
    }, [runningTask]);

    // Calculate current elapsed for a specific task (for display)
    const getTaskElapsed = useCallback((task: Task): number => {
        if (task.is_timer_running && task.last_started_at) {
            const startTime = new Date(task.last_started_at).getTime();
            const additionalSeconds = Math.floor((Date.now() - startTime) / 1000);
            return (task.total_elapsed_seconds ?? 0) + additionalSeconds;
        }
        return task.total_elapsed_seconds ?? 0;
    }, []);

    // Stop any currently running timer (internal helper)
    const stopCurrentTimer = useCallback(async () => {
        if (!runningTaskId || !runningTask) return;

        // Calculate final elapsed time
        let finalSeconds = runningTask.total_elapsed_seconds ?? 0;
        if (runningTask.last_started_at) {
            const startTime = new Date(runningTask.last_started_at).getTime();
            const additionalSeconds = Math.floor((Date.now() - startTime) / 1000);
            finalSeconds += additionalSeconds;
        }

        // Update task in database
        await onUpdateTask(runningTaskId, {
            is_timer_running: false,
            last_started_at: null,
            total_elapsed_seconds: finalSeconds,
            actual_time_minutes: Math.floor(finalSeconds / 60)
        });

        setRunningTaskId(null);
        setCurrentElapsedSeconds(0);
    }, [runningTaskId, runningTask, onUpdateTask]);

    // Start timer for a task
    const startTimer = useCallback(async (task: Task) => {
        setIsLoading(true);
        try {
            // If another timer is running, stop it first (EXCLUSIVE CONTROL)
            if (runningTaskId && runningTaskId !== task.id) {
                await stopCurrentTimer();
            }

            // Start the new timer
            const now = new Date().toISOString();
            await onUpdateTask(task.id, {
                is_timer_running: true,
                last_started_at: now
            });

            setRunningTaskId(task.id);
        } finally {
            setIsLoading(false);
        }
    }, [runningTaskId, stopCurrentTimer, onUpdateTask]);

    // Pause timer (stop without completing)
    const pauseTimer = useCallback(async () => {
        setIsLoading(true);
        try {
            await stopCurrentTimer();
        } finally {
            setIsLoading(false);
        }
    }, [stopCurrentTimer]);

    // Complete timer (stop and mark task as done)
    const completeTimer = useCallback(async () => {
        if (!runningTaskId || !runningTask) return;

        setIsLoading(true);
        try {
            // Calculate final elapsed time
            let finalSeconds = runningTask.total_elapsed_seconds ?? 0;
            if (runningTask.last_started_at) {
                const startTime = new Date(runningTask.last_started_at).getTime();
                const additionalSeconds = Math.floor((Date.now() - startTime) / 1000);
                finalSeconds += additionalSeconds;
            }

            // Update task: stop timer AND mark as done
            await onUpdateTask(runningTaskId, {
                is_timer_running: false,
                last_started_at: null,
                total_elapsed_seconds: finalSeconds,
                actual_time_minutes: Math.floor(finalSeconds / 60),
                status: 'done'
            });

            setRunningTaskId(null);
            setCurrentElapsedSeconds(0);
        } finally {
            setIsLoading(false);
        }
    }, [runningTaskId, runningTask, onUpdateTask]);

    // Interrupt timer (same as pause, but UI indicates "returning to list")
    const interruptTimer = useCallback(async () => {
        await pauseTimer();
    }, [pauseTimer]);

    return (
        <TimerContext.Provider value={{
            runningTaskId,
            runningTask,
            currentElapsedSeconds,
            startTimer,
            pauseTimer,
            completeTimer,
            interruptTimer,
            isLoading
        }}>
            {children}
        </TimerContext.Provider>
    );
}

// Utility function to format seconds as HH:MM:SS
export function formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
