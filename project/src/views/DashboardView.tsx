import { useCallback, useEffect, useMemo, useState } from 'react';
import { KanbanSquare, CalendarClock, Target, Flame, CheckCircle2, Circle, Clock, ArrowRight, TrendingUp, type LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Task, TimeBlock, Habit, HabitCompletion } from '@/lib/types';
import { HABIT_COLORS, PRIORITY_STYLES } from '@/lib/types';
import type { View } from '@/components/Sidebar';

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${period}`;
}

function computeStreak(dates: Set<string>): number {
  let streak = 0;
  const d = new Date();
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

export function DashboardView({ onNavigate }: { onNavigate: (v: View) => void }) {
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

  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, inProgress, done, total, completionRate };
  }, [tasks]);

  const completionMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    completions.forEach((c) => {
      if (!m.has(c.habit_id)) m.set(c.habit_id, new Set());
      m.get(c.habit_id)!.add(c.completion_date);
    });
    return m;
  }, [completions]);

  const habitsToday = useMemo(() => {
    const doneCount = habits.filter((h) => completionMap.get(h.id)?.has(today) ?? false).length;
    return { done: doneCount, total: habits.length };
  }, [habits, completionMap, today]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 5);
  }, [tasks]);

  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.start_hour - b.start_hour), [blocks]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{greeting}</h2>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Circle}
          label="To Do"
          value={stats.todo}
          tint="bg-slate-100 text-slate-600"
          onClick={() => onNavigate('tasks')}
        />
        <StatCard
          icon={KanbanSquare}
          label="In Progress"
          value={stats.inProgress}
          tint="bg-brand-100 text-brand-600"
          onClick={() => onNavigate('tasks')}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.done}
          tint="bg-emerald-100 text-emerald-600"
          sub={`${stats.completionRate}% done`}
          onClick={() => onNavigate('tasks')}
        />
        <StatCard
          icon={Flame}
          label="Habits Today"
          value={`${habitsToday.done}/${habitsToday.total}`}
          tint="bg-orange-100 text-orange-600"
          onClick={() => onNavigate('habits')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Today's schedule */}
        <Panel
          title="Today's Schedule"
          icon={CalendarClock}
          onAction={() => onNavigate('calendar')}
        >
          {sortedBlocks.length === 0 ? (
            <EmptyRow text="No time blocks today" />
          ) : (
            <ul className="space-y-2">
              {sortedBlocks.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-1.5">
                  <div className="flex flex-col items-center justify-center w-12 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-700">{fmtHour(b.start_hour)}</span>
                  </div>
                  <div className="w-1 h-8 rounded-full bg-brand-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{b.title}</p>
                    <p className="text-[11px] text-slate-400">{fmtHour(b.start_hour)} – {fmtHour(b.end_hour)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Upcoming tasks */}
        <Panel
          title="Priority Tasks"
          icon={KanbanSquare}
          onAction={() => onNavigate('tasks')}
        >
          {upcomingTasks.length === 0 ? (
            <EmptyRow text="No open tasks" />
          ) : (
            <ul className="space-y-2.5">
              {upcomingTasks.map((t) => {
                const pr = PRIORITY_STYLES[t.priority];
                return (
                  <li key={t.id} className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${t.status === 'in_progress' ? 'bg-brand-500' : 'bg-slate-300'} shrink-0`} />
                    <span className="text-sm text-slate-700 truncate flex-1">{t.title}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${pr.badge} shrink-0`}>{pr.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Habit streaks */}
        <Panel
          title="Habit Streaks"
          icon={Flame}
          onAction={() => onNavigate('habits')}
        >
          {habits.length === 0 ? (
            <EmptyRow text="No habits tracked" />
          ) : (
            <ul className="space-y-2.5">
              {habits.slice(0, 5).map((h) => {
                const color = HABIT_COLORS[h.color] ?? HABIT_COLORS.blue;
                const dates = completionMap.get(h.id) ?? new Set<string>();
                const streak = computeStreak(dates);
                const doneToday = dates.has(today);
                return (
                  <li key={h.id} className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${color.dot} shrink-0`} />
                    <span className="text-sm text-slate-700 truncate flex-1">{h.name}</span>
                    {doneToday ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Circle size={16} className="text-slate-300 shrink-0" />
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 shrink-0">
                      <Flame size={13} /> {streak}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Progress ring summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center gap-5">
        <ProgressRing percent={stats.completionRate} />
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
            <TrendingUp size={16} className="text-brand-500" /> Task Completion
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {stats.done} of {stats.total} tasks completed. Keep up the momentum!
          </p>
        </div>
        <button
          onClick={() => onNavigate('tasks')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          View board <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  sub,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tint: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-slate-300 hover:shadow-soft transition-all group"
    >
      <div className={`w-9 h-9 rounded-xl ${tint} flex items-center justify-center mb-3`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold text-slate-900 leading-none">{value}</div>
      <div className="text-xs text-slate-500 mt-1.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </button>
  );
}

function Panel({
  title,
  icon: Icon,
  onAction,
  children,
}: {
  title: string;
  icon: LucideIcon;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Icon size={16} className="text-slate-400" /> {title}
        </h3>
        <button onClick={onAction} className="text-slate-400 hover:text-brand-600 transition-colors">
          <ArrowRight size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-sm text-slate-400 py-4 text-center">{text}</p>;
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="#2563eb"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-slate-900">{percent}%</span>
      </div>
    </div>
  );
}
