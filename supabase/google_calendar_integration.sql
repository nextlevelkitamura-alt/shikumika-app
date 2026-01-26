-- Google Calendar Integration Migration
-- ユーザーごとのカレンダー連携設定とトークン管理

-- 1. ユーザーカレンダー設定テーブル
CREATE TABLE IF NOT EXISTS user_calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,

  -- Google OAuth トークン（暗号化推奨）
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMP WITH TIME ZONE,

  -- 同期設定
  is_sync_enabled BOOLEAN DEFAULT false,
  default_calendar_id TEXT DEFAULT 'primary',  -- 'primary' or カスタムカレンダーID
  sync_direction TEXT DEFAULT 'bidirectional',  -- 'to_calendar', 'from_calendar', 'bidirectional'

  -- 同期状態
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle',  -- 'idle', 'syncing', 'error'
  sync_error_message TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. カレンダー同期ログテーブル
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  task_id UUID REFERENCES tasks ON DELETE CASCADE,
  google_event_id TEXT,

  -- 同期情報
  action TEXT NOT NULL,  -- 'create', 'update', 'delete'
  direction TEXT NOT NULL,  -- 'to_calendar', 'from_calendar'
  status TEXT NOT NULL,  -- 'success', 'error', 'skipped'
  error_message TEXT,

  -- 同期されたデータのスナップショット（デバッグ用）
  sync_data JSONB,

  -- タイムスタンプ
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_user_calendar_settings_user_id ON user_calendar_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_user_id ON calendar_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_task_id ON calendar_sync_log(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_google_event_id ON calendar_sync_log(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_synced_at ON calendar_sync_log(synced_at DESC);

-- 4. RLS (Row Level Security) ポリシー
ALTER TABLE user_calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- user_calendar_settings: ユーザーは自分の設定のみアクセス可能
CREATE POLICY "Users can view their own calendar settings"
  ON user_calendar_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar settings"
  ON user_calendar_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar settings"
  ON user_calendar_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar settings"
  ON user_calendar_settings FOR DELETE
  USING (auth.uid() = user_id);

-- calendar_sync_log: ユーザーは自分のログのみ参照可能（削除不可）
CREATE POLICY "Users can view their own sync logs"
  ON calendar_sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert sync logs"
  ON calendar_sync_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_calendar_settings_updated_at
  BEFORE UPDATE ON user_calendar_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. 既存のtasksテーブルにgoogle_event_idがあることを確認（既に存在する場合はスキップ）
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT;
-- 注: google_event_id は既に存在するため、このマイグレーションでは追加不要

-- 7. google_event_id のインデックス（高速検索用）
CREATE INDEX IF NOT EXISTS idx_tasks_google_event_id ON tasks(google_event_id) WHERE google_event_id IS NOT NULL;

-- 8. コメント追加（ドキュメント化）
COMMENT ON TABLE user_calendar_settings IS 'ユーザーごとのGoogleカレンダー連携設定とOAuthトークン';
COMMENT ON TABLE calendar_sync_log IS 'Googleカレンダーとの同期履歴ログ（監査・デバッグ用）';
COMMENT ON COLUMN user_calendar_settings.google_access_token IS 'Google OAuth アクセストークン（有効期限: 1時間）';
COMMENT ON COLUMN user_calendar_settings.google_refresh_token IS 'Google OAuth リフレッシュトークン（長期有効）';
COMMENT ON COLUMN user_calendar_settings.sync_direction IS '同期方向: to_calendar, from_calendar, bidirectional';
COMMENT ON COLUMN calendar_sync_log.sync_data IS '同期時のタスク/イベントデータのスナップショット（JSONB）';
