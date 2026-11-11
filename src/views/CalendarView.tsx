import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Link2, LoaderCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { TimeBlock, Task } from '@/lib/types';
import { Modal } from '@/components/Modal';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23

const DAY_START = 6; // first hour shown by default scroll
const VISIBLE_RANGE: [number, number] = [0, 24];

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prettyDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function fmtHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${period}`;
}

export function CalendarView() {
  const [date, setDate] = useState(() => toLocalDate(new Date()));
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<{ hour: number } | null>(null);

  const dateObj = useMemo(() => new Date(date + 'T00:00:00'), [date]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [blockRes, taskRes] = await Promise.all([
      supabase.from('time_blocks').select('*').eq('block_date', date),
      supabase.from('tasks').select('*').order('title'),
    ]);
    if (blockRes.data) setBlocks(blockRes.data as TimeBlock[]);
    if (taskRes.data) setTasks(taskRes.data as Task[]);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const shiftDay = (delta: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(toLocalDate(d));
  };

  const goToday = () => setDate(toLocalDate(new Date()));

  const deleteBlock = async (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await supabase.from('time_blocks').delete().eq('id', id);
  };

  const taskById = useMemo(() => {
    const m = new Map<string, Task>();
    tasks.forEach((t) => m.set(t.id, t));
    return m;
  }, [tasks]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Schedule</h2>
          <p className="text-sm text-slate-500 mt-0.5">{prettyDate(dateObj)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition">
            Today
          </button>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg">
            <button onClick={() => shiftDay(-1)} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-l-lg transition">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => shiftDay(1)} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-r-lg transition">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && setDate(e.target.value)}
        className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none bg-white"
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoaderCircle className="animate-spin text-brand-500" size={26} />
          </div>
        ) : (
          <div className="overflow-y-auto scrollbar-thin max-h-[70vh]">
            <div className="relative" style={{ height: `${HOURS.length * 64}px` }}>
              {/* hour grid */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-slate-100 flex"
                  style={{ top: `${h * 64}px`, height: '64px' }}
                >
                  <div className="w-20 shrink-0 px-3 pt-1.5 text-[11px] font-medium text-slate-400 select-none">
                    {fmtHour(h)}
                  </div>
                  <button
                    onClick={() => setCreating({ hour: h })}
                    className="flex-1 group relative"
                  >
                    <div className="absolute inset-1.5 rounded-lg group-hover:bg-brand-50/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 bg-white/80 px-2 py-1 rounded-md">
                        <Plus size={13} /> Add block
                      </span>
                    </div>
                  </button>
                </div>
              ))}

              {/* blocks */}
              {blocks.map((b) => {
                const top = b.start_hour * 64;
                const height = (b.end_hour - b.start_hour) * 64;
                const linkedTask = b.task_id ? taskById.get(b.task_id) : null;
                return (
                  <div
                    key={b.id}
                    className="absolute left-24 right-3 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100/60 px-3 py-2 shadow-soft overflow-hidden group"
                    style={{ top: `${top + 4}px`, height: `${height - 8}px` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-800 truncate">{b.title}</p>
                        <p className="text-[11px] text-brand-600 mt-0.5 flex items-center gap-1">
                          <Clock size={11} /> {fmtHour(b.start_hour)} – {fmtHour(b.end_hour)}
                        </p>
                        {linkedTask && (
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate">
                            <Link2 size={11} /> {linkedTask.title}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteBlock(b.id)}
                        className="p-1 rounded text-brand-400 hover:text-rose-600 hover:bg-white/60 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {creating && (
        <BlockFormModal
          date={date}
          startHour={creating.hour}
          tasks={tasks}
          onClose={() => setCreating(null)}
          onSaved={() => {
            setCreating(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function BlockFormModal({
  date,
  startHour,
  tasks,
  onClose,
  onSaved,
}: {
  date: string;
  startHour: number;
  tasks: Task[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(startHour);
  const [end, setEnd] = useState(Math.min(startHour + 1, 24));
  const [taskId, setTaskId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || end <= start) return;
    setSaving(true);
    await supabase.from('time_blocks').insert({
      title: title.trim(),
      block_date: date,
      start_hour: start,
      end_hour: end,
      task_id: taskId || null,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={`Block ${fmtHour(startHour)}`}>
      <div className="space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1.5">Title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="e.g. Deep work session"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1.5">Start</span>
            <select
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none bg-white"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{fmtHour(h)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1.5">End</span>
            <select
              value={end}
              onChange={(e) => setEnd(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none bg-white"
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>{fmtHour(h % 24)}</option>
              ))}
            </select>
          </label>
        </div>
        {tasks.length > 0 && (
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1.5">Link a task (optional)</span>
            <div className="relative">
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none bg-white"
              >
                <option value="">No linked task</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </label>
        )}
        {end <= start && (
          <p className="text-xs text-rose-500">End time must be after start time.</p>
        )}
        <div className="flex justify-end gap-2.5 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim() || end <= start}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'Add Block'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
