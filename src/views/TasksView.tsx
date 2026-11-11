import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, GripVertical, Trash2, Pencil, Flag, CheckCircle2, Circle, LoaderCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Task, TaskStatus, Priority } from '@/lib/types';
import { TASK_STATUSES, PRIORITIES, PRIORITY_STYLES } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/Feedback';

const COLUMN_META: Record<TaskStatus, { title: string; accent: string; dot: string; hint: string }> = {
  todo: { title: 'To Do', accent: 'text-slate-700', dot: 'bg-slate-400', hint: 'Planned but not started' },
  in_progress: { title: 'In Progress', accent: 'text-brand-600', dot: 'bg-brand-500', hint: 'Actively working' },
  done: { title: 'Done', accent: 'text-emerald-600', dot: 'bg-emerald-500', hint: 'Completed' },
};

interface DragState {
  taskId: string;
  fromStatus: TaskStatus;
}

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('status', { ascending: true })
      .order('sort_order', { ascending: true });
    if (!error && data) setTasks(data as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach((t) => g[t.status]?.push(t));
    return g;
  }, [tasks]);

  const counts = useMemo(() => ({
    todo: grouped.todo.length,
    in_progress: grouped.in_progress.length,
    done: grouped.done.length,
  }), [grouped]);

  const moveTo = useCallback(async (taskId: string, status: TaskStatus) => {
    const now = new Date().toISOString();
    const completed_at = status === 'done' ? now : null;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status, completed_at } : t)));
    const { error } = await supabase.from('tasks').update({ status, completed_at, updated_at: now }).eq('id', taskId);
    if (error) fetchTasks();
  }, [fetchTasks]);

  const onDrop = useCallback((status: TaskStatus) => {
    if (drag) moveTo(drag.taskId, status);
    setDrag(null);
    setDragOverCol(null);
  }, [drag, moveTo]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoaderCircle className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tasks</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {counts.todo} to do · {counts.in_progress} in progress · {counts.done} done
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-soft"
        >
          <Plus size={18} /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TASK_STATUSES.map((status) => {
          const meta = COLUMN_META[status];
          const isOver = dragOverCol === status;
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverCol !== status) setDragOverCol(status);
              }}
              onDragLeave={() => setDragOverCol((c) => (c === status ? null : c))}
              onDrop={() => onDrop(status)}
              className={`flex flex-col rounded-2xl border transition-colors min-h-[200px] ${
                isOver ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-100">
                <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                <h3 className={`text-sm font-semibold ${meta.accent}`}>{meta.title}</h3>
                <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {grouped[status].length}
                </span>
              </div>

              <div className="flex-1 p-3 space-y-2.5 overflow-y-auto scrollbar-thin max-h-[60vh]">
                {grouped[status].length === 0 && (
                  <EmptyState
                    icon={Circle}
                    title="No tasks here"
                    hint="Drag a task card to move it"
                  />
                )}
                {grouped[status].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => setEditing(task)}
                    onDelete={() => deleteTask(task.id)}
                    onDragStart={() => setDrag({ taskId: task.id, fromStatus: task.status })}
                    onDragEnd={() => {
                      setDrag(null);
                      setDragOverCol(null);
                    }}
                    onToggleDone={() => moveTo(task.id, task.status === 'done' ? 'todo' : 'done')}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {(creating || editing) && (
        <TaskFormModal
          task={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onToggleDone,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onToggleDone: () => void;
}) {
  const pr = PRIORITY_STYLES[task.priority];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group bg-white rounded-xl border border-slate-200 p-3.5 cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-soft transition-all"
    >
      <div className="flex items-start gap-2">
        <button onClick={onToggleDone} className="mt-0.5 shrink-0 text-slate-300 hover:text-emerald-500 transition-colors">
          {task.status === 'done' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2.5">
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${pr.badge}`}>
              <Flag size={10} /> {pr.label}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50">
            <Trash2 size={14} />
          </button>
          <GripVertical size={14} className="text-slate-300 mt-1" />
        </div>
      </div>
    </div>
  );
}

function TaskFormModal({
  task,
  onClose,
  onSaved,
}: {
  task: Task | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [dueDate, setDueDate] = useState(task?.due_date ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      due_date: dueDate || null,
      completed_at: status === 'done' ? (task?.completed_at ?? now) : null,
    };
    if (task) {
      await supabase.from('tasks').update({ ...payload, updated_at: now }).eq('id', task.id);
    } else {
      await supabase.from('tasks').insert(payload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={task ? 'Edit Task' : 'New Task'}>
      <div className="space-y-4">
        <Field label="Title">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="What needs to be done?"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details (optional)"
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition resize-none"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition bg-white"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_STYLES[p].label}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition bg-white"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </Field>
        </div>
        <Field label="Due date">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition"
          />
        </Field>
        <div className="flex justify-end gap-2.5 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
