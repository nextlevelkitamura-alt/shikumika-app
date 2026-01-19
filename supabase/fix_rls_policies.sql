-- =====================================================
-- RLS Policy Fix: Add WITH CHECK for INSERT operations
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing policies (they only have USING, not WITH CHECK)
DROP POLICY IF EXISTS "Users can CRUD their own goals" ON goals;
DROP POLICY IF EXISTS "Users can CRUD their own projects" ON projects;
DROP POLICY IF EXISTS "Users can CRUD their own task_groups" ON task_groups;
DROP POLICY IF EXISTS "Users can CRUD their own tasks" ON tasks;

-- Recreate with both USING (for SELECT/UPDATE/DELETE) and WITH CHECK (for INSERT/UPDATE)
CREATE POLICY "Users can CRUD their own goals" ON goals
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD their own projects" ON projects
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD their own task_groups" ON task_groups
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD their own tasks" ON tasks
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
