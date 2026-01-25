-- Add priority and scheduled_at columns to groups table
-- For Group Task UI Improvement

-- Add priority column (1-4, NULL = not set)
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT NULL;

-- Add scheduled_at column (deadline for the group)
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NULL;

-- Optional: Add comment for documentation
COMMENT ON COLUMN groups.priority IS 'Priority level: 1=Urgent, 2=High, 3=Medium, 4=Low, NULL=Not set';
COMMENT ON COLUMN groups.scheduled_at IS 'Scheduled deadline for the group task';
