# Googleカレンダー連携 セットアップガイド

このガイドでは、Googleカレンダー連携機能を有効化するための設定手順を説明します。

---

## 1. Supabase データベース設定

### 1.1 マイグレーション実行

SupabaseダッシュボードでSQLを実行します。

1. **Supabase Dashboard** にアクセス
   - https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **SQL Editor** を開く
   - 左サイドバー → SQL Editor

3. マイグレーションファイルを実行
   - `supabase/google_calendar_integration.sql` の内容をコピー
   - SQL Editorに貼り付け
   - **Run** をクリック

### 1.2 実行内容の確認

以下のテーブルが作成されます：

- ✅ `user_calendar_settings` - ユーザーのカレンダー設定とトークン
- ✅ `calendar_sync_log` - 同期履歴ログ
- ✅ インデックス（パフォーマンス最適化）
- ✅ RLSポリシー（セキュリティ）

確認方法:
```sql
-- テーブル一覧を確認
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_calendar_settings', 'calendar_sync_log');
```

---

## 2. Google Cloud Console 設定

### 2.1 プロジェクト作成（初回のみ）

1. **Google Cloud Console** にアクセス
   - https://console.cloud.google.com/

2. 新しいプロジェクトを作成
   - プロジェクト名: `shikumika-app`
   - プロジェクトID: 自動生成 or カスタム

### 2.2 Google Calendar API を有効化

1. **APIとサービス** → **ライブラリ** を開く
   - https://console.cloud.google.com/apis/library

2. 「Google Calendar API」を検索

3. **有効にする** をクリック

### 2.3 OAuth 同意画面の設定

1. **APIとサービス** → **OAuth 同意画面** を開く
   - https://console.cloud.google.com/apis/credentials/consent

2. ユーザータイプを選択
   - **外部** を選択（一般ユーザー向け）
   - **作成** をクリック

3. アプリ情報を入力
   ```
   アプリ名: Shikumika
   ユーザーサポートメール: your-email@example.com
   デベロッパーの連絡先: your-email@example.com
   ```

4. スコープを追加

   **詳細手順**:

   a. **スコープを追加または削除** ボタンをクリック

   b. ポップアップウィンドウが開いたら、以下の2つの方法があります:

   **方法1: フィルタで検索（推奨）**
   - 「APIをフィルタ」の検索ボックスに `calendar` と入力
   - 「Google Calendar API」セクションが表示される
   - 以下のスコープにチェックを入れる:
     ```
     .../auth/calendar.events
     イベントの表示と編集
     ```

   **方法2: 手動で入力**
   - 「手動でスコープを入力」タブをクリック
   - テキストボックスに以下を1行ずつ入力（またはコピペ）:
     ```
     https://www.googleapis.com/auth/calendar.events
     ```
   - **スコープをテーブルに追加** をクリック

   c. スコープが追加されたことを確認
   - テーブルに `.../auth/calendar.events` が表示されていればOK

   d. **更新** ボタンをクリック

   e. **保存して次へ** をクリック

   **注意**: スコープが見つからない場合
   - Google Calendar APIが有効化されているか確認（2.2参照）
   - APIライブラリで「Google Calendar API」を検索して「有効にする」

5. テストユーザーを追加（開発中のみ）
   - 自分のGoogleアカウントを追加
   - **保存して次へ** → **ダッシュボードに戻る**

### 2.4 OAuth 2.0 クライアントIDの作成

1. **APIとサービス** → **認証情報** を開く
   - https://console.cloud.google.com/apis/credentials

2. **認証情報を作成** → **OAuth クライアント ID**

3. アプリケーションの種類
   - **ウェブアプリケーション** を選択

4. 名前
   ```
   Shikumika Web App
   ```

5. 承認済みのリダイレクトURI
   ```
   開発環境:
   http://localhost:3000/api/auth/callback/google

   本番環境:
   https://your-app.vercel.app/api/auth/callback/google
   ```
   ※ 両方追加してください

6. **作成** をクリック

7. **クライアントID** と **クライアントシークレット** をコピー
   - これらは次のステップで使用します

---

## 3. 環境変数の設定

### 3.1 ローカル開発環境

プロジェクトルートに `.env.local` ファイルを作成（既に存在する場合は追記）:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Calendar API
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# NextAuth (セッション暗号化用)
NEXTAUTH_SECRET=generate-a-random-secret-here
NEXTAUTH_URL=http://localhost:3000
```

**NEXTAUTH_SECRET の生成方法**:
```bash
openssl rand -base64 32
```

### 3.2 Vercel（本番環境）

1. **Vercel Dashboard** にアクセス
   - https://vercel.com/dashboard

2. プロジェクトを選択 → **Settings** → **Environment Variables**

3. 以下の環境変数を追加:

| Key | Value | Environment |
|-----|-------|-------------|
| `GOOGLE_CLIENT_ID` | (Google ConsoleでコピーしたID) | Production, Preview |
| `GOOGLE_CLIENT_SECRET` | (Google Consoleでコピーしたシークレット) | Production, Preview |
| `GOOGLE_REDIRECT_URI` | `https://your-app.vercel.app/api/auth/callback/google` | Production |
| `NEXTAUTH_SECRET` | (生成したランダム文字列) | Production, Preview |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production |

4. **Save** をクリック

---

## 4. 動作確認

### 4.1 ローカル開発サーバー起動

```bash
npm run dev
```

### 4.2 認証フロー確認（実装後）

1. アプリにログイン

2. 設定画面 → Googleカレンダー連携

3. **Googleアカウントと連携** ボタンをクリック

4. Google OAuth画面でアクセスを許可

5. リダイレクト後、「連携済み」と表示されればOK

### 4.3 トラブルシューティング

#### エラー: "redirect_uri_mismatch"
- Google Cloud Consoleの「承認済みのリダイレクトURI」を確認
- 環境変数 `GOOGLE_REDIRECT_URI` が正しいか確認

#### エラー: "invalid_client"
- `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` が正しいか確認
- コピー時にスペースが入っていないか確認

#### エラー: "access_denied"
- OAuth同意画面でスコープが正しく設定されているか確認
- テストユーザーに自分のアカウントが追加されているか確認

---

## 5. セキュリティチェックリスト

- [ ] `.env.local` を `.gitignore` に追加済み
- [ ] Google Client Secretを安全に保管
- [ ] Vercelの環境変数が正しく設定されている
- [ ] Supabase RLSポリシーが有効化されている
- [ ] OAuth同意画面でスコープを最小限に制限

---

## 6. 次のステップ

SupabaseとGoogle Cloud Consoleの設定が完了したら、Phase 1の実装を開始します：

1. ✅ OAuth認証フロー実装
   - `/api/auth/google` (認証URLリダイレクト)
   - `/api/auth/callback/google` (コールバック処理)
   - トークン保存

2. ✅ タスク→カレンダー同期
   - `/api/calendar/sync-task` (タスクをカレンダーに同期)
   - Google Calendar API呼び出し

3. ✅ UI実装
   - 設定画面
   - 同期状態表示

---

## 参考リンク

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 Web Server Flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
