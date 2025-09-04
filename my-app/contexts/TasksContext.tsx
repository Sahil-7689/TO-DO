import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getJson, setJson } from '@/utils/storage';

export type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO date
  priority?: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
};

type TasksContextValue = {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTask: (input: Omit<Task, 'id' | 'createdAt' | 'completed' | 'updatedAt'>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  sync: () => Promise<void>;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);
const STORAGE_KEY = 'tasks_v2';

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const saved = await getJson<Task[]>(STORAGE_KEY, []);
      setTasks(saved);
      setError(null);
    } catch (e) {
      setError('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(async (next: Task[]) => {
    setTasks(next);
    await setJson(STORAGE_KEY, next);
  }, []);

  const addTask = useCallback(async (input: Omit<Task, 'id' | 'createdAt' | 'completed' | 'updatedAt'>) => {
    const optimistic: Task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      priority: input.priority,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [optimistic, ...tasks];
    await persist(next);
  }, [persist, tasks]);

  const toggleTask = useCallback(async (id: string) => {
    const next = tasks.map(t => t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t);
    await persist(next);
  }, [persist, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const next = tasks.filter(t => t.id !== id);
    await persist(next);
  }, [persist, tasks]);

  // Cloud sync (Supabase)
  const sync = useCallback(async () => {
    try {
      setError(null);
      const { getSupabase, hasSupabaseConfig } = await import('@/lib/supabase');
      if (!hasSupabaseConfig()) return; // skip if not configured
      const supabase = getSupabase();
      // Ensure table schema:
      // create table if not exists public.tasks (id text primary key, title text, description text, due_date timestamptz, priority text, completed boolean, created_at timestamptz, updated_at timestamptz);
      // Pull remote
      const { data: remote, error: pullErr } = await supabase
        .from('tasks')
        .select('*');
      if (pullErr) throw pullErr;
      type RemoteRow = { id: string; title: string; description: string | null; due_date: string | null; priority: string | null; completed: boolean | null; created_at: string | null; updated_at: string | null };
      const remoteTasks = (remote as RemoteRow[] | null ?? []).map((r) => ({
        id: r.id as string,
        title: r.title as string,
        description: r.description ?? undefined,
        dueDate: r.due_date ? new Date(r.due_date).toISOString() : undefined,
        priority: r.priority ?? undefined,
        completed: !!r.completed,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      })) as Task[];

      // Merge by latest updatedAt (last-write-wins)
      const byId = new Map<string, Task>();
      for (const t of tasks) byId.set(t.id, t);
      for (const rt of remoteTasks) {
        const lt = byId.get(rt.id);
        if (!lt) byId.set(rt.id, rt);
        else byId.set(rt.id, new Date(rt.updatedAt) >= new Date(lt.updatedAt) ? rt : lt);
      }
      const merged = Array.from(byId.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      await persist(merged);

      // Push local changes newer than remote
      const toUpsert = merged.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description ?? null,
        due_date: m.dueDate ?? null,
        priority: m.priority ?? null,
        completed: m.completed,
        created_at: m.createdAt,
        updated_at: m.updatedAt,
      }));
      const { error: pushErr } = await supabase.from('tasks').upsert(toUpsert, { onConflict: 'id' });
      if (pushErr) throw pushErr;
    } catch (e) {
      setError('Sync failed');
    }
  }, [tasks, persist]);

  const value = useMemo<TasksContextValue>(() => ({
    tasks,
    isLoading,
    error,
    refresh: load,
    addTask,
    toggleTask,
    deleteTask,
    sync,
  }), [tasks, isLoading, error, load, addTask, toggleTask, deleteTask, sync]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
};

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}


