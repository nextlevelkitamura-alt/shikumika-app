-- Phase 5: Schema Updates for Parent-Child Tasks and AI Suggestions
-- Run this in Supabase SQL Editor

-- 1. Add parent_task_id to tasks table for hierarchical structure
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;

-- 2. Add order_index to tasks for sorting
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- 3. Create ai_suggestions table for AI feedback extensibility
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  suggestion_type text NOT NULL, -- 'task_creation', 'task_reschedule', 'calendar_sync', 'schedule_optimization'
  target_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  target_group_id uuid REFERENCES task_groups(id) ON DELETE CASCADE,
  payload jsonb NOT NULL, -- Flexible data: { title, scheduled_at, estimated_time, reason, etc. }
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'adjusted'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for ai_suggestions
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policy for ai_suggestions
DROP POLICY IF EXISTS "Users can CRUD their own ai_suggestions" ON ai_suggestions;
CREATE POLICY "Users can CRUD their own ai_suggestions" ON ai_suggestions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Verify changes
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks';
