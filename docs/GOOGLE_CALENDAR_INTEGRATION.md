# Googleカレンダー連携機能 企画書

## 1. 機能概要

ShikumikaアプリとGoogleカレンダーの双方向同期機能を実装し、タスク管理とスケジュール管理をシームレスに統合する。

### 1.1 目的

- **タスクからカレンダーへ**: 予定時刻・所要時間が設定されたタスクを自動的にGoogleカレンダーに反映
- **カレンダーからタスクへ**: Googleカレンダーの予定をShikumikaにインポートし、MindMapと優先順位で管理
- **双方向同期**: どちらで編集しても、常に最新の状態を維持

### 1.2 ターゲットユーザー

1. **カレンダー中心派**: Googleカレンダーで予定管理し、それをタスクとして分解・管理したい
2. **タスク中心派**: タスクを先に作成し、実行予定をカレンダーに自動反映したい
3. **ハイブリッド派**: 会議はカレンダー、作業タスクはMindMapで管理

---

## 2. ユースケース

### UC-1: タスクをカレンダーに同期
**シナリオ**: ユーザーが「資料作成」タスクに日時と所要時間を設定

```
ユーザー操作:
1. MindMapで「資料作成」タスクを作成
2. scheduled_at = "2026-01-27 14:00"
3. estimated_time = 120分

システム動作:
1. Googleカレンダーに新規イベント作成
   - タイトル: "資料作成"
   - 開始: 2026-01-27 14:00
   - 終了: 2026-01-27 16:00 (開始 + 120分)
2. google_event_id をタスクに保存
3. カレンダーアイコンに「同期済み」マーク表示
```

### UC-2: カレンダーの予定をインポート
**シナリオ**: ユーザーがGoogleカレンダーで「火曜MTG」を作成

```
ユーザー操作:
1. Googleカレンダーで「火曜MTG」を14:00-15:00に作成
2. Shikumikaアプリを開く

システム動作:
1. Google Calendar APIから未同期イベントを取得
2. 「未分類タスク」グループ（または専用グループ）に新規タスク作成
   - title: "火曜MTG"
   - scheduled_at: "2026-01-27 14:00"
   - estimated_time: 60分
   - google_event_id: (GoogleイベントID)
3. 右サイドバーに「新しいカレンダー予定をインポートしました」通知
```

### UC-3: 双方向同期（時刻変更）
**シナリオ**: カレンダーで予定時刻を変更

```
ユーザー操作:
1. Googleカレンダーで「資料作成」を14:00→15:00に変更

システム動作:
1. Webhook or Polling でイベント変更を検知
2. google_event_id でタスクを特定
3. scheduled_at を "2026-01-27 15:00" に更新
4. MindMapのノードに「カレンダーから同期」バッジ表示（3秒間）
```

### UC-4: 予定の削除
**シナリオ**: タスクを削除した場合

```
ユーザー操作:
1. MindMapで「資料作成」タスクを削除

システム動作:
1. google_event_id が存在する場合、確認ダイアログ表示
   「このタスクはGoogleカレンダーと同期しています。カレンダーの予定も削除しますか？」
   [両方削除] [タスクのみ削除] [キャンセル]
2. [両方削除] → Google Calendar APIでイベント削除
3. [タスクのみ削除] → google_event_id = null にしてから削除
```

---

## 3. 技術アーキテクチャ

### 3.1 認証フロー

```
┌─────────────┐
│   ユーザー   │
└──────┬──────┘
       │ 1. ログイン
       ▼
┌─────────────┐
│  Supabase   │
│   Auth      │
└──────┬──────┘
       │ 2. OAuth2.0
       ▼
┌─────────────┐
│   Google    │
│   OAuth     │
└──────┬──────┘
       │ 3. アクセストークン取得
       ▼
┌─────────────┐
│ Supabase DB │
│ user_tokens │ ← google_access_token, refresh_token を保存
└─────────────┘
```

**必要なスコープ**:
- `https://www.googleapis.com/auth/calendar.events` (イベントの読み書き)

### 3.2 データモデル

#### 3.2.1 既存テーブル拡張

**tasks テーブル** (既存):
```sql
-- 既に存在
google_event_id TEXT NULL  -- GoogleカレンダーのイベントID
scheduled_at TIMESTAMP NULL
estimated_time INTEGER  -- 分
```

#### 3.2.2 新規テーブル

**user_calendar_settings** (ユーザーごとのカレンダー設定):
```sql
CREATE TABLE user_calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMP,
  is_sync_enabled BOOLEAN DEFAULT false,
  default_calendar_id TEXT,  -- 同期先のカレンダーID (primary, work など)
  sync_direction TEXT DEFAULT 'bidirectional',  -- 'to_calendar', 'from_calendar', 'bidirectional'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**calendar_sync_log** (同期履歴):
```sql
CREATE TABLE calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  task_id UUID REFERENCES tasks ON DELETE CASCADE,
  google_event_id TEXT,
  action TEXT,  -- 'create', 'update', 'delete'
  direction TEXT,  -- 'to_calendar', 'from_calendar'
  status TEXT,  -- 'success', 'error'
  error_message TEXT,
  synced_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 システム構成

```
┌──────────────────────────────────────────────────────────┐
│                     Next.js App (Client)                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │  MindMap   │  │ Task List  │  │  Calendar Sidebar  │ │
│  └─────┬──────┘  └─────┬──────┘  └──────┬─────────────┘ │
│        │                │                │                │
│        └────────────────┴────────────────┘                │
│                         │                                 │
└─────────────────────────┼─────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js API Routes                     │
│  /api/calendar/sync     - 同期トリガー                   │
│  /api/calendar/connect  - OAuth認証                      │
│  /api/calendar/webhook  - Google Webhooks受信            │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┴──────────────┐
          ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│   Supabase DB    │          │ Google Calendar  │
│   - tasks        │          │      API         │
│   - settings     │          │  - events.list   │
│   - sync_log     │          │  - events.insert │
└──────────────────┘          │  - events.update │
                              │  - events.delete │
                              └──────────────────┘
```

---

## 4. データフロー

### 4.1 タスク→カレンダー同期フロー

```
1. User: タスクに scheduled_at を設定
   ↓
2. onUpdateTask(taskId, { scheduled_at, estimated_time })
   ↓
3. Supabaseにタスク保存（楽観的更新）
   ↓
4. useMindMapSync.ts: 同期フラグをチェック
   if (scheduled_at && estimated_time && is_sync_enabled) {
     ↓
5. POST /api/calendar/sync-task
     - taskId, scheduled_at, estimated_time を送信
   ↓
6. API Route:
   a. user_calendar_settings から access_token 取得
   b. Google Calendar API呼び出し:
      POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
      Body: {
        summary: task.title,
        start: { dateTime: scheduled_at },
        end: { dateTime: scheduled_at + estimated_time }
      }
   c. レスポンスから google_event_id 取得
   d. Supabase: UPDATE tasks SET google_event_id = ? WHERE id = taskId
   e. calendar_sync_log に記録
   ↓
7. UIに同期完了通知（トースト or バッジ）
```

### 4.2 カレンダー→タスク同期フロー

#### A. Polling方式（初期実装）

```
1. useEffect: 30秒ごとにポーリング
   ↓
2. GET /api/calendar/sync-from-calendar
   ↓
3. API Route:
   a. Google Calendar API: events.list
      - timeMin: 現在時刻
      - timeMax: 現在時刻 + 7日
      - updatedMin: 前回同期時刻
   b. 未同期イベントを抽出（google_event_id が tasksテーブルに存在しない）
   c. 各イベントに対して:
      - tasksテーブルに新規作成
      - google_event_id を保存
      - デフォルトグループ（"カレンダー同期"）に配置
   d. 同期済みイベントで更新があれば:
      - scheduled_at, estimated_time を更新
   ↓
4. UI: 新規タスクを通知
```

#### B. Webhook方式（将来実装）

```
1. Googleカレンダーでイベント変更
   ↓
2. Google Pub/Sub → Webhook通知
   POST /api/calendar/webhook
   ↓
3. API Route:
   a. イベントIDを取得
   b. events.get で最新情報取得
   c. tasksテーブルを更新
   ↓
4. Supabase Realtime経由でUIに即座に反映
```

---

## 5. UI/UX設計

### 5.1 設定画面

**場所**: `/settings/calendar` または右サイドバー上部

```
┌────────────────────────────────────────┐
│  Googleカレンダー連携                   │
├────────────────────────────────────────┤
│  [ ] 同期を有効化                       │
│                                        │
│  [Googleアカウントと連携]  ← 未連携時  │
│  または                                │
│  ✓ 連携済み (user@gmail.com)  [解除]  │
│                                        │
│  同期方向:                              │
│  ○ 双方向（推奨）                       │
│  ○ タスク → カレンダーのみ             │
│  ○ カレンダー → タスクのみ             │
│                                        │
│  同期先カレンダー:                      │
│  [プライマリカレンダー ▼]               │
│                                        │
│  [変更を保存]                           │
└────────────────────────────────────────┘
```

### 5.2 タスクノードの同期状態表示

```
┌──────────────────────────────────┐
│ 資料作成  📅 1/27 14:00  ⏱️ 2h   │
│                          ↑       │
│                    同期済みアイコン│
└──────────────────────────────────┘

ホバー時:
┌──────────────────────────────────┐
│ 資料作成                          │
│ 📅 1/27 14:00 - 16:00            │
│ ✓ Googleカレンダーと同期済み      │
│   [カレンダーで開く]              │
└──────────────────────────────────┘
```

### 5.3 カレンダーサイドバーの改善

現在のモックアップを実際のGoogleカレンダーAPIデータで表示:

```
┌────────────────────────────────────┐
│ Googleカレンダー (同期済み)         │
│ [今日] [週] [月]  [更新]           │
├────────────────────────────────────┤
│  月25  火26  水27  木28  金29      │
│ ┌────┬────┬────┬────┬────┐       │
│ │    │    │■■■■│    │    │ 9:00  │
│ │    │■■■■│    │    │    │ 10:00 │
│ │■■■■│    │    │    │■■■■│ 11:00 │
│ └────┴────┴────┴────┴────┘       │
│                                    │
│ ■ Shikumikaタスク                 │
│ ■ 外部イベント                    │
│                                    │
│ [+] 新しい予定を作成               │
└────────────────────────────────────┘
```

### 5.4 通知・フィードバック

1. **同期成功**: トースト通知「Googleカレンダーに同期しました」
2. **同期失敗**: 「カレンダー同期に失敗しました。再試行しますか？」
3. **新規インポート**: 右サイドバーのAIパネルに通知
   ```
   新しいカレンダー予定をインポートしました:
   - 火曜MTG (1/27 14:00)
   - クライアント打ち合わせ (1/28 10:00)

   [タスクとして追加] [無視]
   ```

---

## 6. セキュリティ考慮事項

### 6.1 認証トークンの保護

- **保存場所**: Supabase DB (暗号化)
- **アクセス制御**: RLSポリシーでユーザー自身のトークンのみアクセス可能
- **トークン更新**: refresh_token を使用して access_token を自動更新

```sql
-- RLS Policy
CREATE POLICY "Users can only access their own tokens"
  ON user_calendar_settings
  FOR ALL
  USING (auth.uid() = user_id);
```

### 6.2 API呼び出しの制限

- **レート制限**: Google Calendar API のクォータ（1ユーザーあたり1日1000リクエスト）
- **エラーハンドリング**: 403/429エラー時は指数バックオフでリトライ
- **ログ記録**: すべてのAPI呼び出しを calendar_sync_log に記録

### 6.3 データプライバシー

- **最小権限**: カレンダーの読み書き権限のみ（連絡先等は不要）
- **ユーザー同意**: 初回連携時に明示的な同意UI
- **連携解除**: いつでも解除可能、解除時にトークン削除

---

## 7. 段階的実装計画

### Phase 1: 基本的な片方向同期（タスク→カレンダー）

**目標**: scheduled_at が設定されたタスクをGoogleカレンダーに反映

**実装項目**:
1. ✅ Google OAuth認証フロー
   - `/api/calendar/connect` (OAuth URL生成)
   - `/api/calendar/callback` (認証コールバック)
   - user_calendar_settings テーブル作成

2. ✅ タスク作成時の同期
   - `useMindMapSync.ts` に同期ロジック追加
   - `/api/calendar/sync-task` API Route作成
   - Google Calendar API呼び出し (events.insert)

3. ✅ UI改善
   - 設定画面で「Googleアカウントと連携」ボタン
   - タスクノードに同期状態アイコン

**期間**: 2週間

### Phase 2: 双方向同期（カレンダー→タスク）

**目標**: Googleカレンダーの変更をShikumikaに反映

**実装項目**:
1. ✅ Polling同期
   - 30秒ごとにGoogleカレンダーから新規・更新イベントを取得
   - `/api/calendar/sync-from-calendar` API Route
   - 未同期イベントをタスクとして作成

2. ✅ 更新・削除の同期
   - カレンダーでイベント変更 → タスク更新
   - カレンダーでイベント削除 → タスク削除（確認ダイアログ）

3. ✅ 競合解決
   - 両方で同時編集された場合の処理（タイムスタンプ比較）

**期間**: 2週間

### Phase 3: リアルタイム同期（Webhook）

**目標**: 即座に双方向同期

**実装項目**:
1. ✅ Google Pub/Sub設定
   - Webhook URL設定 (`/api/calendar/webhook`)
   - チャンネル登録 (events.watch)

2. ✅ Supabase Realtime
   - tasksテーブルの変更をリアルタイム通知
   - UIに即座に反映

**期間**: 1週間

### Phase 4: 高度な機能

**実装項目**:
1. ✅ 複数カレンダー対応
2. ✅ 定期イベントの同期
3. ✅ カレンダーの色分け（優先度マッピング）
4. ✅ リマインダー同期

**期間**: 2週間

---

## 8. 技術的課題と解決策

### 8.1 トークン更新の自動化

**課題**: access_token は1時間で失効

**解決策**:
```typescript
// lib/google-calendar.ts
async function getAccessToken(userId: string) {
  const settings = await getCalendarSettings(userId);

  if (isTokenExpired(settings.google_token_expires_at)) {
    // refresh_token で新しい access_token を取得
    const newToken = await refreshGoogleToken(settings.google_refresh_token);

    // DBに保存
    await updateCalendarSettings(userId, {
      google_access_token: newToken.access_token,
      google_token_expires_at: new Date(Date.now() + newToken.expires_in * 1000)
    });

    return newToken.access_token;
  }

  return settings.google_access_token;
}
```

### 8.2 同期のパフォーマンス

**課題**: 大量のタスクがある場合、同期が遅い

**解決策**:
- **バッチ処理**: 複数イベントを一度にAPI呼び出し（Batch Request）
- **差分同期**: updatedMin パラメータで前回同期以降の変更のみ取得
- **キャッシュ**: 短時間の同期リクエストはキャッシュから返す

### 8.3 競合解決

**課題**: Shikumikaとカレンダーで同時に編集された場合

**解決策**:
```
1. 最終更新時刻を比較
2. 新しい方を優先（Last Write Wins）
3. ユーザーに通知:
   「カレンダーで最近変更されたため、こちらの変更は上書きされました」
4. 将来的には「競合を確認」UIで手動選択
```

### 8.4 APIクォータ制限

**課題**: Google Calendar APIは1日1000リクエスト/ユーザー

**解決策**:
- **Webhook優先**: Pollingは最小限にし、Webhookでリアルタイム更新
- **キャッシュ**: 頻繁にアクセスされるデータはキャッシュ
- **エラーハンドリング**: 429エラー時はExponential Backoff

---

## 9. 成功指標（KPI）

1. **連携率**: 全ユーザーの30%がカレンダー連携を有効化
2. **同期精度**: 同期成功率 99%以上
3. **ユーザー満足度**: カレンダー連携機能のNPS 8以上
4. **利用頻度**: 連携ユーザーの70%が週1回以上同期

---

## 10. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Google APIの仕様変更 | 高 | 公式ライブラリ使用、定期的なテスト |
| トークン漏洩 | 高 | 暗号化、RLS、監査ログ |
| 同期ループ（無限ループ） | 中 | 同期済みフラグ、タイムスタンプ比較 |
| ユーザーの混乱 | 中 | わかりやすいUI、チュートリアル |
| パフォーマンス低下 | 中 | バッチ処理、キャッシュ |

---

## 11. 参考資料

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)

---

## 12. まとめ

Googleカレンダー連携は、Shikumikaアプリの価値を大きく高める機能です。段階的に実装することで、リスクを最小限に抑えながら、ユーザーにとって本当に便利な機能を提供できます。

**次のステップ**:
1. Phase 1の実装開始（OAuth認証フロー）
2. ユーザーテスト（5-10名）
3. フィードバックを元に改善
4. Phase 2以降へ展開
