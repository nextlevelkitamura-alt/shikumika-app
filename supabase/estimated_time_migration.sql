-- Add estimated_time column for task_groups (manual override for auto-calculated group estimate)
-- Run this in Supabase SQL Editor

ALTER TABLE task_groups
ADD COLUMN IF NOT EXISTS estimated_time INTEGER DEFAULT NULL;

COMMENT ON COLUMN task_groups.estimated_time IS
'Estimated time in minutes for the group. NULL = auto-calculated from tasks, INTEGER = manually overridden value';

