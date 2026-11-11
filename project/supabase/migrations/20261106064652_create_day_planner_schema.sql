/*
# Day Planner — initial schema

Single-tenant app (no sign-in). All tables are intentionally shared/public,
so policies use `USING (true)` with `TO anon, authenticated`.

## 1. New Tables

### tasks
Kanban board tasks. `status` drives which column a task appears in
(todo / in_progress / done). `sort_order` controls ordering within a column.

- id (uuid, PK)
- title (text, not null)
- description (text, nullable)
- status (text, not null, default 'todo') — 'todo' | 'in_progress' | 'done'
- priority (text, default 'medium') — 'low' | 'medium' | 'high'
- sort_order (int, default 0)
- created_at, updated_at (timestamptz)

### time_blocks
Hourly calendar blocks. May optionally reference a task.

- id (uuid, PK)
- task_id (uuid, FK -> tasks ON DELETE SET NULL, nullable)
- title (text, not null)
- block_date (date, not null)
- start_hour (int, not null, 0–23)
- end_hour (int, not null, 1–24)
- created_at (timestamptz)

### habits
Habit definitions for the daily tracker.

- id (uuid, PK)
- name (text, not null)
- color (text, default 'blue')
- created_at (timestamptz)

### habit_completions
One row per habit per completed day. Unique on (habit_id, completion_date)
so toggling a day is idempotent.

- id (uuid, PK)
- habit_id (uuid, FK -> habits ON DELETE CASCADE)
- completion_date (date, not null)
- created_at (timestamptz)

## 2. Security
- RLS enabled on all four tables.
- CRUD granted to anon + authenticated (no-auth single-tenant app).
- Policies allow all CRUD for anon + authenticated (intentionally shared data).

## 3. Indexes
- tasks(status) — kanban column queries.
- time_blocks(block_date) — calendar day queries.
- habit_completions(habit_id, completion_date) — streak lookups.
*/

-- ---------- tasks ----------
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ---------- time_blocks ----------
CREATE TABLE IF NOT EXISTS time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  block_date date NOT NULL,
  start_hour int NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  end_hour int NOT NULL CHECK (end_hour >= 1 AND end_hour <= 24),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON time_blocks TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_time_blocks" ON time_blocks;
CREATE POLICY "anon_select_time_blocks" ON time_blocks FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_time_blocks" ON time_blocks;
CREATE POLICY "anon_insert_time_blocks" ON time_blocks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_time_blocks" ON time_blocks;
CREATE POLICY "anon_update_time_blocks" ON time_blocks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_time_blocks" ON time_blocks;
CREATE POLICY "anon_delete_time_blocks" ON time_blocks FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_time_blocks_date ON time_blocks(block_date);

-- ---------- habits ----------
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON habits TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_habits" ON habits;
CREATE POLICY "anon_select_habits" ON habits FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_habits" ON habits;
CREATE POLICY "anon_insert_habits" ON habits FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_habits" ON habits;
CREATE POLICY "anon_update_habits" ON habits FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_habits" ON habits;
CREATE POLICY "anon_delete_habits" ON habits FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- habit_completions ----------
CREATE TABLE IF NOT EXISTS habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completion_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completion_date)
);

ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON habit_completions TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_habit_completions" ON habit_completions;
CREATE POLICY "anon_select_habit_completions" ON habit_completions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_habit_completions" ON habit_completions;
CREATE POLICY "anon_insert_habit_completions" ON habit_completions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_habit_completions" ON habit_completions;
CREATE POLICY "anon_update_habit_completions" ON habit_completions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_habit_completions" ON habit_completions;
CREATE POLICY "anon_delete_habit_completions" ON habit_completions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date ON habit_completions(habit_id, completion_date);
