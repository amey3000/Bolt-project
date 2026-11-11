export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TimeBlock {
  id: string;
  task_id: string | null;
  title: string;
  block_date: string;
  start_hour: number;
  end_hour: number;
  created_at: string;
}

export interface Habit {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  completion_date: string;
  created_at: string;
}

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
export const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export const HABIT_COLORS: Record<string, { bg: string; ring: string; text: string; dot: string }> = {
  blue: { bg: 'bg-blue-500', ring: 'ring-blue-500', text: 'text-blue-600', dot: 'bg-blue-500' },
  green: { bg: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-600', dot: 'bg-amber-500' },
  rose: { bg: 'bg-rose-500', ring: 'ring-rose-500', text: 'text-rose-600', dot: 'bg-rose-500' },
  violet: { bg: 'bg-violet-500', ring: 'ring-violet-500', text: 'text-violet-600', dot: 'bg-violet-500' },
  cyan: { bg: 'bg-cyan-500', ring: 'ring-cyan-500', text: 'text-cyan-600', dot: 'bg-cyan-500' },
};

export const PRIORITY_STYLES: Record<Priority, { label: string; badge: string }> = {
  high: { label: 'High', badge: 'bg-rose-100 text-rose-700' },
  medium: { label: 'Medium', badge: 'bg-amber-100 text-amber-700' },
  low: { label: 'Low', badge: 'bg-slate-100 text-slate-600' },
};
