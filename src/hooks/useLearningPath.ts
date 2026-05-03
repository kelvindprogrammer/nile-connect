import { useState, useCallback, useEffect } from 'react';

export interface LearningTask {
    id: string;
    title: string;
    source: string; // e.g. 'Udemy', 'Coursera', 'Internal'
    url?: string;
    category: 'skill' | 'course' | 'test' | 'project';
    status: 'todo' | 'in_progress' | 'completed';
    recommendedDate: string;
    completedDate?: string;
    priority: 'low' | 'medium' | 'high';
}

const STORAGE_KEY = 'nile_learning_path';

export function useLearningPath() {
    const [tasks, setTasks] = useState<LearningTask[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try { setTasks(JSON.parse(stored)); } catch { /* ignore */ }
        }
    }, []);

    const saveTasks = (newTasks: LearningTask[]) => {
        setTasks(newTasks);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
    };

    const addTask = useCallback((task: Omit<LearningTask, 'id' | 'recommendedDate' | 'status'>) => {
        const newTask: LearningTask = {
            ...task,
            id: Date.now().toString(),
            status: 'todo',
            recommendedDate: new Date().toISOString(),
        };
        setTasks(prev => {
            const next = [newTask, ...prev];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const updateTaskStatus = useCallback((id: string, status: LearningTask['status']) => {
        setTasks(prev => {
            const next = prev.map(t => 
                t.id === id 
                    ? { ...t, status, completedDate: status === 'completed' ? new Date().toISOString() : undefined } 
                    : t
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const deleteTask = useCallback((id: string) => {
        setTasks(prev => {
            const next = prev.filter(t => t.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    return { tasks, addTask, updateTaskStatus, deleteTask };
}
