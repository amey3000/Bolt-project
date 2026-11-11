import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Flame, Trash2, Check, Pencil, LoaderCircle, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Habit, HabitCompletion } from '@/lib/types';
import { HABIT_COLORS } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/Feedback';

const DAY_COUNT = 14; // last 14 days shown

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayLabel(d: Date, idx: number): string {
  if (idx === DAY_COUNT - 1) return 'Today';
  if (idx === DAY_COUNT - 2) return 'Yest';
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
}

function computeStreak(dates: Set<string>): number {
  let streak = 0;
  const d = new Date();
  // if today not done but yesterday is, streak still counts from yesterday
  if (!dates.has(toLocalDate(d))) {
    d.setDate(d.getDate() - 1);
    if (!dates.has(toLocalDate(d))) return 0;
  }
  while (dates.has(toLocalDate(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function HabitsView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [hRes, cRes] = await Promise.all([
      supabase.from('habits').select('*').order('created_at'),
      supabase.from('habit_completions').select('*'),
    ]);
    if (hRes.data) setHabits(hRes.data as Habit[]);
    if (cRes.data) setCompletions(cRes.data as HabitCompletion[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    const today = new Date();
    for (let i = DAY_COUNT - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, []);

  const completionMap = useMemo(() => {
    const m = new Map<string, Set<string>>(); // habitId -> set of dates
    completions.forEach((c) => {
      if (!m.has(c.habit_id)) m.set(c.habit_id, new Set());
      m.get(c.habit_id)!.add(c.completion_date);
    });
    return m;
  }, [completions]);

  const toggleDay = useCallback(async (habitId: string, dateStr: string) => {
    const set = completionMap.get(habitId) ?? new Set<string>();
    const isDone = set.has(dateStr);
    // optimistic
    if (isDone) {
      setCompletions((prev) => prev.filter((c) => !(c.habit_id === habitId && c.completion_date === dateStr)));
      await supabase.from('habit_completions').delete().eq('habit_id', habitId).eq('completion_date', dateStr);
    } else {
      setCompletions((prev) => [...prev, {
        id: crypto.randomUUID(),
        habit_id: habitId,
        completion_date: dateStr,
        created_at: new Date().toISOString(),
      }]);
      await supabase.from('habit_completions').insert({ habit_id: habitId, completion_date: dateStr });
    }
  }, [completionMap]);

  const deleteHabit = useCallback(async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await supabase.from('habits').delete().eq('id', id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoaderCircle className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  const todayStr = toLocalDate(new Date());

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Habits</h2>
          <p className="text-sm text-slate-500 mt-0.5">Build streaks by checking in every day</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-soft"
        >
          <Plus size={18} /> New Habit
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Target} title="No habits yet" hint="Create a habit to start tracking streaks" />
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const color = HABIT_COLORS[habit.color] ?? HABIT_COLORS.blue;
            const doneDates = completionMap.get(habit.id) ?? new Set<string>();
            const streak = computeStreak(doneDates);
            const todayDone = doneDates.has(todayStr);

            return (
              <div key={habit.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 group">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-3 h-3 rounded-full ${color.dot} shrink-0`} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{habit.name}</h3>
                      <p className="text-xs text-slate-400">
                        {todayDone ? 'Completed today' : 'Not done today'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-100">
                      <Flame size={15} className="text-orange-500" />
                      <span className="text-sm font-bold text-orange-600">{streak}</span>
                      <span className="text-[11px] text-orange-400">day{streak === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setEditing(habit)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteHabit(habit.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* day grid */}
                <div className="grid grid-flow-col auto-cols-fr gap-1.5 sm:gap-2">
                  {days.map((d, idx) => {
                    const ds = toLocalDate(d);
                    const done = doneDates.has(ds);
                    const isToday = idx === DAY_COUNT - 1;
                    return (
                      <button
                        key={ds}
                        onClick={() => toggleDay(habit.id, ds)}
                        className="flex flex-col items-center gap-1.5 group/day"
                      >
                        <span className={`text-[10px] font-medium ${isToday ? 'text-brand-600' : 'text-slate-400'}`}>
                          {dayLabel(d, idx)}
                        </span>
                        <span
                          className={`w-full aspect-square max-w-[34px] rounded-lg flex items-center justify-center transition-all ${
                            done
                              ? `${color.bg} text-white shadow-soft`
                              : 'bg-slate-50 text-slate-300 group-hover/day:bg-slate-100 border border-slate-100'
                          } ${isToday && !done ? 'ring-2 ring-brand-200' : ''}`}
                        >
                          {done && <Check size={15} />}
                        </span>
                        <span className={`text-[9px] ${done ? 'text-slate-500' : 'text-slate-300'}`}>
                          {d.getDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <HabitFormModal
          habit={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function HabitFormModal({
  habit,
  onClose,
  onSaved,
}: {
  habit: Habit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(habit?.name ?? '');
  const [color, setColor] = useState(habit?.color ?? 'blue');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (habit) {
      await supabase.from('habits').update({ name: name.trim(), color }).eq('id', habit.id);
    } else {
      await supabase.from('habits').insert({ name: name.trim(), color });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={habit ? 'Edit Habit' : 'New Habit'}>
      <div className="space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1.5">Habit name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="e.g. Read 20 minutes"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition"
          />
        </label>
        <div>
          <span className="block text-xs font-medium text-slate-500 mb-2">Color</span>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(HABIT_COLORS).map(([key, c]) => (
              <button
                key={key}
                onClick={() => setColor(key)}
                className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center transition-all ${
                  color === key ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                }`}
              >
                {color === key && <Check size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : habit ? 'Save Changes' : 'Create Habit'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
