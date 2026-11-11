/*
# Due dates and completion timestamps for tasks

Adds two optional fields to tasks so the Today page and Progress charts
can work from real dates instead of guesses.

## 1. Modified table: tasks
- `due_date` (date, nullable): the day a task is planned to be finished.
  Tasks with no due date simply do not appear on the Today page.
- `completed_at` (timestamptz, nullable): when a task was moved to Done.
  Used to count tasks completed per week.

## 2. Backfill
- Existing tasks already marked Done get `completed_at` set to their last
  update time, so historical weekly charts show something sensible.
  This only fills empty values and is safe to re-run.

## 3. Security
- No policy or grant changes. The existing owner-scoped RLS policies on
  tasks cover the new columns.

## 4. Indexes
- tasks(user_id, due_date) for the Today page lookup.
- tasks(user_id, completed_at) for weekly progress queries.

## Important notes
1. No existing data is removed or altered beyond filling empty completed_at values.
2. Both columns are nullable, so existing rows remain valid.
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE tasks
SET completed_at = updated_at
WHERE status = 'done' AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed_at);
