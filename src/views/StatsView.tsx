import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Flame, Clock, KanbanSquare, TrendingUp, LoaderCircle, type LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Task, TimeBlock, Habit, HabitCompletion } from '@/lib/types';
import { HABIT_COLORS } from '@/lib/types';
import { toLocalDate, addDays, startOfWeek, computeCurrentStreak, computeLongestStreak } from '@/lib/dates';

const WEEKS = 8;
const DAYS = 7;

function fmtDayShort(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
}

export function StatsView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [t, b, h, c] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('time_blocks').select('*'),
      supabase.from('habits').select('*').order('created_at'),
      supabase.from('habit_completions').select('*'),
    ]);
    if (t.data) setTasks(t.data as Task[]);
    if (b.data) setBlocks(b.data as TimeBlock[]);
    if (h.data) setHabits(h.data as Habit[]);
    if (c.data) setCompletions(c.data as HabitCompletion[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const completionMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    completions.forEach((c) => {
      if (!m.has(c.habit_id)) m.set(c.habit_id, new Set());
      m.get(c.habit_id)!.add(c.completion_date);
    });
    return m;
  }, [completions]);

  // Tasks completed per week (last 8 weeks)
  const weeklyData = useMemo(() => {
    const today = new Date();
    const thisWeekStart = startOfWeek(today);
    const weeks: { label: string; count: number; weekStart: Date }[] = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const ws = addDays(thisWeekStart, -w * 7);
      const we = addDays(ws, 6);
      const wsStr = toLocalDate(ws);
      const weStr = toLocalDate(we);
      const count = tasks.filter((t) => {
        if (t.status !== 'done' || !t.completed_at) return false;
        const d = toLocalDate(new Date(t.completed_at));
        return d >= wsStr && d <= weStr;
      }).length;
      weeks.push({
        label: ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
        weekStart: ws,
      });
    }
    return weeks;
  }, [tasks]);

  const maxWeekly = Math.max(1, ...weeklyData.map((w) => w.count));

  // Hours time-blocked per day (last 7 days)
  const dailyHours = useMemo(() => {
    const today = new Date();
    const days: { date: Date; hours: number }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      const ds = toLocalDate(d);
      const hours = blocks
        .filter((b) => b.block_date === ds)
        .reduce((sum, b) => sum + (b.end_hour - b.start_hour), 0);
      days.push({ date: d, hours });
    }
    return days;
  }, [blocks]);

  const maxDailyHours = Math.max(1, ...dailyHours.map((d) => d.hours));

  // Habit streaks
  const habitStreaks = useMemo(() => {
    return habits.map((h) => {
      const dates = completionMap.get(h.id) ?? new Set<string>();
      return {
        habit: h,
        current: computeCurrentStreak(dates),
        longest: computeLongestStreak(dates),
      };
    });
  }, [habits, completionMap]);

  const maxStreak = Math.max(1, ...habitStreaks.map((h) => h.longest));

  const totalCompletedThisWeek = weeklyData[weeklyData.length - 1]?.count ?? 0;
  const totalHoursThisWeek = dailyHours.reduce((sum, d) => sum + d.hours, 0);
  const bestStreak = habitStreaks.reduce((best, h) => Math.max(best, h.current), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoaderCircle className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Progress</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your productivity over time</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatBig
          icon={KanbanSquare}
          label="Completed This Week"
          value={totalCompletedThisWeek}
          sub="tasks marked done"
          tint="bg-brand-100 text-brand-600"
        />
        <StatBig
          icon={Clock}
          label="Hours Blocked"
          value={totalHoursThisWeek}
          sub="last 7 days"
          tint="bg-sky-100 text-sky-600"
        />
        <StatBig
          icon={Flame}
          label="Best Streak"
          value={bestStreak}
          sub="days and counting"
          tint="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Tasks completed per week */}
      <ChartCard title="Tasks Completed Per Week" icon={BarChart3}>
        {weeklyData.every((w) => w.count === 0) ? (
          <ChartEmpty text="No completed tasks yet this period" />
        ) : (
          <div className="flex items-end justify-between gap-2 sm:gap-3 h-44 px-1">
            {weeklyData.map((w, i) => {
              const isCurrent = i === weeklyData.length - 1;
              const heightPct = (w.count / maxWeekly) * 100;
              return (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                  <span className="text-[11px] font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    {w.count}
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isCurrent ? 'bg-brand-500' : 'bg-brand-200 group-hover:bg-brand-300'
                      }`}
                      style={{ height: `${Math.max(heightPct, w.count > 0 ? 6 : 2)}%` }}
                      title={`${w.count} tasks`}
                    />
                  </div>
                  <span className={`text-[10px] ${isCurrent ? 'text-brand-600 font-semibold' : 'text-slate-400'}`}>
                    {w.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Hours time-blocked per day */}
        <ChartCard title="Hours Time-Blocked" icon={Clock}>
          {dailyHours.every((d) => d.hours === 0) ? (
            <ChartEmpty text="No time blocks this week" />
          ) : (
            <div className="flex items-end justify-between gap-2 h-44 px-1">
              {dailyHours.map((d, i) => {
                const isToday = i === dailyHours.length - 1;
                const heightPct = (d.hours / maxDailyHours) * 100;
                return (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                    <span className="text-[11px] font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.hours}h
                    </span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isToday ? 'bg-sky-500' : 'bg-sky-200 group-hover:bg-sky-300'
                        }`}
                        style={{ height: `${Math.max(heightPct, d.hours > 0 ? 6 : 2)}%` }}
                        title={`${d.hours}h`}
                      />
                    </div>
                    <span className={`text-[10px] ${isToday ? 'text-sky-600 font-semibold' : 'text-slate-400'}`}>
                      {fmtDayShort(d.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Habit streaks */}
        <ChartCard title="Habit Streaks" icon={Flame}>
          {habitStreaks.length === 0 ? (
            <ChartEmpty text="No habits tracked yet" />
          ) : (
            <div className="space-y-3">
              {habitStreaks.map(({ habit, current, longest }) => {
                const color = HABIT_COLORS[habit.color] ?? HABIT_COLORS.blue;
                const currentPct = (current / maxStreak) * 100;
                const longestPct = (longest / maxStreak) * 100;
                return (
                  <div key={habit.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${color.dot} shrink-0`} />
                        <span className="text-sm text-slate-700 truncate">{habit.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                          <Flame size={12} /> {current}
                        </span>
                        <span className="text-slate-400">best {longest}</span>
                      </div>
                    </div>
                    <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-slate-200 transition-all duration-500"
                        style={{ width: `${Math.max(longestPct, longest > 0 ? 4 : 0)}%` }}
                      />
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${color.bg} transition-all duration-500`}
                        style={{ width: `${Math.max(currentPct, current > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 pt-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm bg-brand-300" /> Current streak
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm bg-slate-200" /> Longest streak
                </span>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Insight footer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <TrendingUp size={20} className="text-brand-600" />
        </div>
        <p className="text-sm text-slate-600">
          {totalCompletedThisWeek === 0 && totalHoursThisWeek === 0 ? (
            <>Start completing tasks and blocking time to see your trends here.</>
          ) : (
            <>
              You completed <strong className="text-slate-900">{totalCompletedThisWeek}</strong> tasks
              and blocked <strong className="text-slate-900">{totalHoursThisWeek}h</strong> of focus
              time this week.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function StatBig({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub: string;
  tint: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className={`w-10 h-10 rounded-xl ${tint} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <div className="text-3xl font-bold text-slate-900 leading-none">{value}</div>
      <div className="text-sm font-medium text-slate-600 mt-2">{label}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-5">
        <Icon size={16} className="text-slate-400" /> {title}
      </h3>
      {children}
    </div>
  );
}

function ChartEmpty({ text }: { text: string }) {
  return <p className="text-sm text-slate-400 py-10 text-center">{text}</p>;
}
