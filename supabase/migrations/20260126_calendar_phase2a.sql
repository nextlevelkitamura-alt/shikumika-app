-- Phase 2A: Multiple Calendar Support Migration
-- 複数カレンダー対応のためのスキーマ拡張

-- 1. user_calendar_settings テーブルに calendars カラム追加
ALTER TABLE user_calendar_settings
ADD COLUMN IF NOT EXISTS calendars JSONB DEFAULT '[]'::jsonb;

-- コメント追加
COMMENT ON COLUMN user_calendar_settings.calendars IS 'ユーザーのGoogleカレンダーリスト（ID, 名前, 色, 有効/無効）';

-- 2. tasks テーブルに target_calendar_id カラム追加
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS target_calendar_id TEXT DEFAULT 'primary';

-- コメント追加
COMMENT ON COLUMN tasks.target_calendar_id IS 'このタスクをスケジュールするカレンダーID（primary, work@gmail.com など）';

-- 3. tasks テーブルに同期関連カラム追加
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- コメント追加
COMMENT ON COLUMN tasks.last_synced_at IS '最終同期時刻';
COMMENT ON COLUMN tasks.sync_status IS '同期状態: synced, pending, error';

-- 4. インデックス追加（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_tasks_target_calendar
ON tasks(target_calendar_id)
WHERE target_calendar_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_sync_status
ON tasks(sync_status)
WHERE sync_status != 'synced';

-- 5. 既存データの初期化
-- 既に google_event_id を持つタスクは sync_status を 'synced' に設定
UPDATE tasks
SET sync_status = 'synced',
    last_synced_at = updated_at
WHERE google_event_id IS NOT NULL
  AND sync_status IS NULL;

-- 6. RLS ポリシーの確認（既存ポリシーは維持）
-- tasks テーブルの既存RLSポリシーに新しいカラムへのアクセスが含まれることを確認
-- （特に変更不要：既存のポリシーで全カラムにアクセス可能）
