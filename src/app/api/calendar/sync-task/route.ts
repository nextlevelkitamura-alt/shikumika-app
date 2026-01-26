import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { syncTaskToCalendar } from '@/lib/google-calendar';

/**
 * タスクをGoogleカレンダーに同期
 * POST /api/calendar/sync-task
 * Body: { taskId: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ログインユーザーを確認
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    // タスクを取得
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // scheduled_at と estimated_time が必要
    if (!task.scheduled_at || !task.estimated_time) {
      return NextResponse.json(
        { error: 'Task must have scheduled_at and estimated_time' },
        { status: 400 }
      );
    }

    // カレンダー連携が有効か確認
    const { data: settings } = await supabase
      .from('user_calendar_settings')
      .select('is_sync_enabled')
      .eq('user_id', user.id)
      .single();

    if (!settings?.is_sync_enabled) {
      return NextResponse.json(
        { error: 'Calendar sync is not enabled' },
        { status: 400 }
      );
    }

    // Googleカレンダーに同期
    const result = await syncTaskToCalendar(user.id, taskId, task);

    return NextResponse.json({
      success: true,
      googleEventId: result.googleEventId,
    });
  } catch (error: any) {
    console.error('Sync task error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync task' },
      { status: 500 }
    );
  }
}
