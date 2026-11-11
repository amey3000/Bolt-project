import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Sun,
  CalendarClock,
  KanbanSquare,
  Target,
  ArrowRight,
  LoaderCircle,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Task, TimeBlock, Habit, HabitCompletion } from '@/lib/types';
import { HABIT_COLORS, PRIORITY_STYLES } from '@/lib/types';
import { toLocalDate, computeCurrentStreak } from '@/lib/dates';
import type { View } from '@/components/Sidebar';

function fmtHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${period}`;
}

export function TodayView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const today = toLocalDate(new Date());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [t, b, h, c] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('time_blocks').select('*').eq('block_date', today),
      supabase.from('habits').select('*').order('created_at'),
      supabase.from('habit_completions').select('*'),
    ]);
    if (t.data) setTasks(t.data as Task[]);
    if (b.data) setBlocks(b.data as TimeBlock[]);
    if (h.data) setHabits(h.data as Habit[]);
    if (c.data) setCompletions(c.data as HabitCompletion[]);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const completionMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    completions.forEach((c) => {
      if (!m.has(c.habit_id)) m.set(c.habit_id, new Set());
      m.get(c.habit_id)!.add(c.completion_date);
    });
    return m;
  }, [completions]);

  const dueToday = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done' && t.due_date === today)
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      });
  }, [tasks, today]);

  const completedToday = useMemo(() => {
    return tasks.filter((t) => t.status === 'done' && t.due_date === today).length;
  }, [tasks, today]);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.start_hour - b.start_hour),
    [blocks],
  );

  const hoursBlocked = useMemo(() => {
    return sortedBlocks.reduce((sum, b) => sum + (b.end_hour - b.start_hour), 0);
  }, [sortedBlocks]);

  const habitsToday = useMemo(() => {
    return habits.map((h) => {
      const dates = completionMap.get(h.id) ?? new Set<string>();
      return { habit: h, doneToday: dates.has(today), streak: computeCurrentStreak(dates) };
    });
  }, [habits, completionMap, today]);

  const habitsRemaining = habitsToday.filter((h) => !h.doneToday);

  const toggleHabit = useCallback(
    async (habitId: string, dateStr: string) => {
      const set = completionMap.get(habitId) ?? new Set<string>();
      const isDone = set.has(dateStr);
      if (isDone) {
        setCompletions((prev) =>
          prev.filter((c) => !(c.habit_id === habitId && c.completion_date === dateStr)),
        );
        await supabase
          .from('habit_completions')
          .delete()
          .eq('habit_id', habitId)
          .eq('completion_date', dateStr);
      } else {
        setCompletions((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            habit_id: habitId,
            completion_date: dateStr,
            created_at: new Date().toISOString(),
          },
        ]);
        await supabase
          .from('habit_completions')
          .insert({ habit_id: habitId, completion_date: dateStr });
      }
    },
    [completionMap],
  );

  const toggleTask = useCallback(
    async (taskId: string, currentStatus: Task['status']) => {
      const next = currentStatus === 'done' ? 'todo' : 'done';
      const now = new Date().toISOString();
      const completed_at = next === 'done' ? now : null;
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: next, completed_at } : t)),
      );
      const { error } = await supabase
        .from('tasks')
        .update({ status: next, completed_at, updated_at: now })
        .eq('id', taskId);
      if (error) fetchAll();
    },
    [fetchAll],
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoaderCircle className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  const nothingToday =
    dueToday.length === 0 && sortedBlocks.length === 0 && habitsToday.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-soft">
          <Sun size={22} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{greeting}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{todayDateLabel}</p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <SummaryChip
          icon={KanbanSquare}
          label="Tasks Due"
          value={dueToday.length}
          sub={`${completedToday} done`}
          tint="bg-brand-100 text-brand-600"
        />
        <SummaryChip
          icon={CalendarClock}
          label="Time Blocked"
          value={`${hoursBlocked}h`}
          sub={`${sortedBlocks.length} block${sortedBlocks.length === 1 ? '' : 's'}`}
          tint="bg-sky-100 text-sky-600"
        />
        <SummaryChip
          icon={Target}
          label="Habits Left"
          value={`${habitsRemaining.length}/${habitsToday.length}`}
          sub={
            habitsToday.length > 0
              ? `${habitsToday.length - habitsRemaining.length} done`
              : 'none set'
          }
          tint="bg-orange-100 text-orange-600"
        />
      </div>

      {nothingToday && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Nothing on the agenda</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            You have no tasks due, no time blocks, and no habits to check off today. Enjoy the
            breather or plan ahead.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => onNavigate('tasks')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 transition"
            >
              Add a task <ArrowRight size={15} />
            </button>
            <button
              onClick={() => onNavigate('calendar')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Block time <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Tasks due today */}
        <Section
          title="Tasks Due Today"
          icon={KanbanSquare}
          count={dueToday.length}
          onAction={() => onNavigate('tasks')}
          emptyText="No tasks due today"
        >
          <ul className="space-y-2">
            {dueToday.map((t) => {
              const pr = PRIORITY_STYLES[t.priority];
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition"
                >
                  <button
                    onClick={() => toggleTask(t.id, t.status)}
                    className="shrink-0 text-slate-300 hover:text-emerald-500 transition-colors"
                  >
                    {t.status === 'done' ? (
                      <CheckCircle2 size={20} className="text-emerald-500" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                    {t.description && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{t.description}</p>
                    )}
                  </div>
                  {t.status === 'in_progress' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 shrink-0">
                      In Progress
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${pr.badge} shrink-0`}
                  >
                    {pr.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* Today's time blocks */}
        <Section
          title="Today's Time Blocks"
          icon={CalendarClock}
          count={sortedBlocks.length}
          onAction={() => onNavigate('calendar')}
          emptyText="No time blocks scheduled"
        >
          <ul className="space-y-2">
            {sortedBlocks.map((b) => {
              const duration = b.end_hour - b.start_hour;
              return (
                <li
                  key={b.id}
                  className="flex items-stretch gap-3 bg-white rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition"
                >
                  <div className="flex flex-col items-center justify-center w-14 shrink-0 bg-brand-50 rounded-lg py-2">
                    <span className="text-[11px] font-bold text-brand-700">{fmtHour(b.start_hour)}</span>
                    <span className="text-[10px] text-brand-400 mt-0.5">{duration}h</span>
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-800 truncate">{b.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock size={11} /> {fmtHour(b.start_hour)} – {fmtHour(b.end_hour)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      {/* Habits to check off */}
      {habitsToday.length > 0 && (
        <Section
          title="Habits To Check Off"
          icon={Target}
          count={habitsToday.length}
          onAction={() => onNavigate('habits')}
          emptyText="No habits tracked"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {habitsToday.map(({ habit, doneToday, streak }) => {
              const color = HABIT_COLORS[habit.color] ?? HABIT_COLORS.blue;
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id, today)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    doneToday
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-soft'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      doneToday ? `${color.bg} text-white` : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    {doneToday ? <Check size={18} /> : <Circle size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium truncate ${
                        doneToday ? 'text-slate-500 line-through' : 'text-slate-800'
                      }`}
                    >
                      {habit.name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {doneToday ? 'Done today' : 'Tap to check off'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 shrink-0">
                    <Flame size={13} /> {streak}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function SummaryChip({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub: string;
  tint: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className={`w-9 h-9 rounded-xl ${tint} flex items-center justify-center mb-3`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold text-slate-900 leading-none">{value}</div>
      <div className="text-xs text-slate-500 mt-1.5">{label}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  onAction,
  emptyText,
  children,
}: {
  title: string;
  icon: LucideIcon;
  count: number;
  onAction: () => void;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Icon size={16} className="text-slate-400" /> {title}
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {count}
          </span>
        </h3>
        <button
          onClick={onAction}
          className="text-slate-400 hover:text-brand-600 transition-colors"
        >
          <ArrowRight size={16} />
        </button>
      </div>
      {count === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}
