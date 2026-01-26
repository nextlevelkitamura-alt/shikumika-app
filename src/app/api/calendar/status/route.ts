import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * カレンダー連携状態を取得
 * GET /api/calendar/status
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // ログインユーザーを確認
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // カレンダー設定を取得
    const { data: settings, error } = await supabase
      .from('user_calendar_settings')
      .select('is_sync_enabled, sync_status, last_synced_at, sync_direction, default_calendar_id')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }

    return NextResponse.json({
      isConnected: !!settings,
      isSyncEnabled: settings?.is_sync_enabled || false,
      syncStatus: settings?.sync_status || 'idle',
      lastSyncedAt: settings?.last_synced_at || null,
      syncDirection: settings?.sync_direction || 'bidirectional',
      defaultCalendarId: settings?.default_calendar_id || 'primary',
    });
  } catch (error: any) {
    console.error('Get calendar status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get calendar status' },
      { status: 500 }
    );
  }
}
