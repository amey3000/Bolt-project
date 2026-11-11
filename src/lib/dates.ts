const DAY_MS = 86_400_000;

export function toLocalDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(ds: string): Date {
  return new Date(`${ds}T00:00:00`);
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + days);
  return x;
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function computeCurrentStreak(dates: Set<string>, today: Date = new Date()): number {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!dates.has(toLocalDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(toLocalDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeLongestStreak(dates: Set<string>): number {
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const ds of [...dates].sort()) {
    const d = parseLocalDate(ds);
    const consecutive = prev !== null && Math.round((d.getTime() - prev.getTime()) / DAY_MS) === 1;
    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
