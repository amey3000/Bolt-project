/*
# Multi-user data isolation

Converts the existing single-tenant day planner tables into multi-user,
owner-scoped tables so each signed-in user only sees their own data.

## 1. What changes

- `tasks`, `time_blocks`, `habits`, `habit_completions` each get a new
  `user_id` column (uuid, NOT NULL, DEFAULT auth.uid(), references
  auth.users ON DELETE CASCADE). The DEFAULT means frontend inserts
  that omit user_id still satisfy the new INSERT policy.
- All four tables switch from the old "anon + authenticated, USING(true)"
  public policies to authenticated-only, owner-scoped CRUD policies.
- `habit_completions` ownership is scoped through its parent habit:
  SELECT/INSERT/UPDATE/DELETE require the habit's owner to match auth.uid().
  This keeps the unique (habit_id, completion_date) constraint intact.
- Grants switched from `anon, authenticated` to `authenticated` only.

## 2. Existing data

There are a handful of existing rows with no owner. Since there is no
authenticated user to claim them, these rows are deleted before the
NOT NULL user_id columns are added. This is a fresh cutover to
multi-user mode; no user data of record is lost.

## 3. Security
- RLS stays enabled on all four tables.
- All policies scoped TO authenticated with auth.uid() = user_id
  (or, for habit_completions, an EXISTS check on the parent habit).
- Anon role loses all access (the app now requires sign-in).

## 4. Indexes
- tasks(user_id, status)
- time_blocks(user_id, block_date)
- habits(user_id)
- habit_completions(habit_id, completion_date) — already present, kept.
*/

-- ---------- tasks ----------
DELETE FROM tasks;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- drop old anon policies
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;

REVOKE SELECT, INSERT, UPDATE, DELETE ON tasks FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;

CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);

-- ---------- time_blocks ----------
DELETE FROM time_blocks;
ALTER TABLE time_blocks ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "anon_select_time_blocks" ON time_blocks;
DROP POLICY IF EXISTS "anon_insert_time_blocks" ON time_blocks;
DROP POLICY IF EXISTS "anon_update_time_blocks" ON time_blocks;
DROP POLICY IF EXISTS "anon_delete_time_blocks" ON time_blocks;

REVOKE SELECT, INSERT, UPDATE, DELETE ON time_blocks FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON time_blocks TO authenticated;

CREATE POLICY "select_own_time_blocks" ON time_blocks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_time_blocks" ON time_blocks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_time_blocks" ON time_blocks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_time_blocks" ON time_blocks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_time_blocks_user_date ON time_blocks(user_id, block_date);

-- ---------- habits ----------
DELETE FROM habits;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "anon_select_habits" ON habits;
DROP POLICY IF EXISTS "anon_insert_habits" ON habits;
DROP POLICY IF EXISTS "anon_update_habits" ON habits;
DROP POLICY IF EXISTS "anon_delete_habits" ON habits;

REVOKE SELECT, INSERT, UPDATE, DELETE ON habits FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON habits TO authenticated;

CREATE POLICY "select_own_habits" ON habits FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_habits" ON habits FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_habits" ON habits FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_habits" ON habits FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);

-- ---------- habit_completions ----------
-- ownership flows through the parent habit; no direct user_id column.
DELETE FROM habit_completions;

DROP POLICY IF EXISTS "anon_select_habit_completions" ON habit_completions;
DROP POLICY IF EXISTS "anon_insert_habit_completions" ON habit_completions;
DROP POLICY IF EXISTS "anon_update_habit_completions" ON habit_completions;
DROP POLICY IF EXISTS "anon_delete_habit_completions" ON habit_completions;

REVOKE SELECT, INSERT, UPDATE, DELETE ON habit_completions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON habit_completions TO authenticated;

CREATE POLICY "select_own_habit_completions" ON habit_completions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid())
  );
CREATE POLICY "insert_own_habit_completions" ON habit_completions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid())
  );
CREATE POLICY "update_own_habit_completions" ON habit_completions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid()));
CREATE POLICY "delete_own_habit_completions" ON habit_completions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid())
  );
