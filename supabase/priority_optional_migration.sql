-- =====================================================
-- Priority Optional Feature Migration
-- Change default priority from 3 to NULL
-- =====================================================

-- Change default priority to NULL (optional/unset)
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT NULL;

-- Optional: Clear existing default priorities (priority = 3)
-- Uncomment the following line if you want to reset all "medium" priorities to NULL
-- UPDATE tasks SET priority = NULL WHERE priority = 3;

-- Verify changes
SELECT column_name, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'priority';
