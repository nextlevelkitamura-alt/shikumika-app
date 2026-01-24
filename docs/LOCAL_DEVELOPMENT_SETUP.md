# ローカル開発環境の構築ガイド

## 🎯 目的

**Vercelの無料枠を節約しながら、効率的にローカル開発する**

---

## 📊 解決策: ブランチ戦略（推奨）

### 仕組み

```
develop ブランチ
  ↓ 開発・テスト（Vercelにデプロイされない）
  ↓ push × 10回（無料枠を消費しない）
  ↓
main ブランチにマージ
  ↓ （ここで1回だけVercelにデプロイ）
  ↓
本番環境に反映
```

### メリット

- ✅ **Vercel節約**: 80%以上の節約が可能
- ✅ **開発効率**: 頻繁にコミット＆pushしても問題なし
- ✅ **リダイレクト設定**: 1回だけ設定すればOK
- ✅ **Git履歴**: クリーンな履歴を維持

---

## 🚀 実装手順（約10-15分）

### Step 1: developブランチを作成

```bash
# 現在のmainブランチの状態を確認
git status

# developブランチを作成して切り替え
git checkout -b develop

# リモートにpush（初回のみ）
git push -u origin develop
```

**✅ 確認**: `git branch` で `* develop` が表示されればOK

---

### Step 2: Vercel設定を変更

#### 2-1. Vercel Dashboardにアクセス

🔗 **直接リンク**: https://vercel.com/dashboard

1. プロジェクト `shikumika-app` を選択
2. **Settings** タブをクリック

#### 2-2. Production Branchを設定

1. 左サイドバーの **Git** をクリック
2. **Production Branch** セクションを探す
3. `main` に設定されていることを確認（デフォルトで設定済みのはず）

#### 2-3. Deploy Previewsを無効化

同じページの **Deploy Previews** セクション:

```
✅ All branches (すべてのブランチでプレビューデプロイ)
   ↓ これを変更
❌ All branches

代わりに:
⚪ Only production branch (mainのみ)
```

**設定方法**:
1. **Ignored Build Step** セクションに移動
2. カスタムコマンドを入力:
   ```bash
   if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then exit 0; fi
   ```

これで、`main`ブランチ以外はデプロイをスキップします。

**✅ 確認**: 設定を保存したら完了

---

### Step 3: Supabaseにローカル URLを追加

#### 3-1. Supabase Dashboardにアクセス

🔗 **直接リンク**: https://supabase.com/dashboard/projects

1. プロジェクト `shikumika-app` を選択
2. 左サイドバーの **Authentication** をクリック
3. **URL Configuration** をクリック

#### 3-2. Redirect URLsを追加

**Site URL** セクション:
- 既存: `https://your-app.vercel.app`
- **そのままにする**（変更不要）

**Redirect URLs** セクション:
- 既存のURLはそのまま
- 以下の2つを**追加**:

```
http://localhost:3000/auth/callback
http://localhost:3000
```

**追加方法**:
1. **Redirect URLs** の入力欄に1つずつ入力
2. 各URLを入力後、Enterキーで確定
3. 最後に **Save** ボタンをクリック

#### 3-3. 設定後の確認

**Redirect URLs** に以下が全て表示されていればOK:
- ✅ `https://your-app.vercel.app/auth/callback`
- ✅ `https://your-app.vercel.app`
- ✅ `http://localhost:3000/auth/callback` ← 新規追加
- ✅ `http://localhost:3000` ← 新規追加

**✅ 確認**: Save後、設定が反映されればOK

---

## 📖 日常の開発フロー

### A. 通常の開発（Vercelにデプロイされない）

```bash
# developブランチにいることを確認
git branch
# * develop が表示されればOK

# 開発作業
# ... コードを編集 ...

# コミット（何回でもOK）
git add .
git commit -m "feat: 新機能を追加"

# push（Vercelにデプロイされない）
git push origin develop

# ローカルで動作確認
npm run dev
# http://localhost:3000 でGoogle認証も動作する
```

**ポイント**: `develop`ブランチでは何回pushしても**Vercelデプロイされない**

---

### B. 本番環境にデプロイ（動作確認OK後のみ）

```bash
# mainブランチに切り替え
git checkout main

# mainブランチを最新化
git pull origin main

# developブランチをマージ
git merge develop

# 本番環境にデプロイ（ここで初めてVercelにデプロイ）
git push origin main

# 完了したらdevelopに戻る
git checkout develop
```

**ポイント**: `main`ブランチにpushした時だけ**Vercelにデプロイ**される

---

## 🔍 トラブルシューティング

### Q1. ローカルでGoogle認証が動かない

**原因**: Supabaseの設定が反映されていない

**解決策**:
1. Supabaseで`http://localhost:3000/auth/callback`が追加されているか確認
2. ブラウザのキャッシュをクリア（Cmd + Shift + R）
3. 一度ログアウトしてから再ログイン

---

### Q2. developブランチでもVercelにデプロイされる

**原因**: Vercelの設定が正しくない

**解決策**:
1. Vercel Dashboard → Settings → Git
2. **Ignored Build Step** が正しく設定されているか確認:
   ```bash
   if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then exit 0; fi
   ```

---

### Q3. mainにマージ後、Vercelでエラーが出る

**原因**: developで動いていても、本番環境で動かないことがある

**解決策**:
1. developブランチで `npm run build` を実行
2. ビルドエラーがないか確認
3. エラーがあれば修正してから再度mainにマージ

---

## 💡 効果測定

### Before（現在の方法）
- 10回の修正 × 10回push = **10回Vercelデプロイ**
- Vercel無料枠: 100 builds/月 → 10回消費

### After（ブランチ戦略）
- 10回の修正 × 10回push (develop) = **0回Vercelデプロイ**
- 最後にmainにマージ = **1回Vercelデプロイ**
- Vercel無料枠: 100 builds/月 → 1回消費

**節約率: 90%** 🎉

---

## 📚 参考リンク

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://supabase.com/dashboard/projects)
- [Vercel Git Configuration](https://vercel.com/docs/git)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/redirect-urls)

---

## ✅ チェックリスト

セットアップが完了したら、以下を確認:

- [ ] developブランチが作成されている（`git branch`で確認）
- [ ] Vercelで`main`ブランチのみデプロイされる設定
- [ ] Supabaseに`localhost:3000`のリダイレクトURLが追加されている
- [ ] ローカルで`npm run dev`が起動する
- [ ] ローカルでGoogle認証が動作する

**全てチェックできたら、開発準備完了です！** 🚀
