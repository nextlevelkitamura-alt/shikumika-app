import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCalendarClient } from '@/lib/google-calendar';

/**
 * ユーザーのGoogleカレンダーリストを取得
 * GET /api/calendar/list
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // ログインユーザーを確認
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { calendar } = await getCalendarClient(user.id);

    // Googleから全カレンダーを取得
    const response = await calendar.calendarList.list();

    const calendars = response.data.items?.map(cal => ({
      id: cal.id || 'unknown',
      name: cal.summary || 'Unnamed Calendar',
      description: cal.description || null,
      color: cal.backgroundColor || '#3F51B5',
      accessRole: cal.accessRole || 'reader', // owner, writer, reader, freeBusyReader
      primary: cal.primary || false,
      selected: cal.selected !== false, // デフォルトで選択状態
      timeZone: cal.timeZone || 'Asia/Tokyo'
    })) || [];

    // user_calendar_settings に保存
    const { error: updateError } = await supabase
      .from('user_calendar_settings')
      .update({
        calendars: calendars,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to save calendars:', updateError);
      // エラーでも取得したカレンダーは返す
    }

    return NextResponse.json({
      calendars,
      count: calendars.length
    });

  } catch (error: any) {
    console.error('Get calendar list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get calendar list' },
      { status: 500 }
    );
  }
}
