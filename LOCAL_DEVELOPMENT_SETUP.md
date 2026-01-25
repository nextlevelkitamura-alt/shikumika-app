# ローカル開発環境セットアップ - 引き継ぎ事項

**作成日**: 2026年1月25日  
**対象者**: アンチグラビティ（開発チーム）

---

## 🎯 背景

### 課題
- 毎回のコード修正でVercelにデプロイされ、**無料枠を大量消費**していた
- ローカルでGoogle認証が動作せず、開発のたびにVercel環境を使う必要があった

### 解決策
**ブランチ戦略**を導入し、以下を実現：
- ✅ `develop`ブランチでの開発はVercelにデプロイされない
- ✅ `main`ブランチへのマージ時のみVercelにデプロイ
- ✅ ローカル開発でGoogle認証が動作する
- ✅ **Vercel無料枠の節約: 約80-90%**

---

## 🚀 実施した変更内容

### 1. ブランチ戦略の導入

```
develop ブランチ
  ↓ 開発・テスト（何回pushしてもVercelにデプロイされない）
  ↓
main ブランチにマージ
  ↓ （ここで1回だけVercelにデプロイ）
  ↓
本番環境に反映
```

### 2. Git設定

**リポジトリ構成**:
- `main` ブランチ: 本番用（Vercelにデプロイされる）
- `develop` ブランチ: 開発用（Vercelにデプロイされない）

**現在の状態**:
```bash
$ git branch
* develop  # ← 通常はこちらで作業
  main
```

### 3. Vercel設定

**Settings → Build and Deployment → Ignored Build Step**:
```bash
if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then exit 0; fi
```

**効果**: `main`ブランチ以外はビルドをスキップ

### 4. Supabase設定

**Authentication → URL Configuration → Redirect URLs** に以下を追加:
```
✅ https://shikumika-app.vercel.app/auth/callback (本番用)
✅ https://shikumika-app.vercel.app (本番用)
✅ http://localhost:3000/auth/callback (ローカル用) ← 追加
✅ http://localhost:3000 (ローカル用) ← 追加
```

**効果**: ローカルでGoogle認証が動作する

### 5. ポート設定

**変更内容**: `package.json`
```diff
- "dev": "next dev -p 3003",
+ "dev": "next dev",
```

**効果**: デフォルトのポート3000で起動（Supabase設定と一致）

---

## 📖 今後の開発フロー

### 🔄 日常の開発（Vercelにデプロイされない）

```bash
# developブランチにいることを確認
git checkout develop
git pull origin develop

# 開発作業
npm run dev  # http://localhost:3000 で起動

# コミット＆push（何回でもOK、Vercelにデプロイされない）
git add .
git commit -m "feat: 新機能を追加"
git push origin develop  # ← Vercel無料枠を消費しない！
```

### 🚀 本番デプロイ（動作確認OK後のみ）

```bash
# mainブランチに切り替え
git checkout main
git pull origin main

# developブランチをマージ
git merge develop

# コンフリクトがあれば解決

# 本番環境にデプロイ（ここで初めてVercelにデプロイ）
git push origin main  # ← ここでVercel無料枠を1回だけ消費

# developブランチに戻る
git checkout develop
```

---

## ⚠️ 重要な注意事項

### ✅ DO（推奨される行動）

1. **developブランチで開発**
   - 日常的な開発は全て`develop`ブランチで行う
   - 何回pushしても問題なし

2. **ローカルで動作確認**
   - `npm run dev`でローカル起動
   - **HTTP**でアクセス: `http://localhost:3000`（HTTPSではない）
   - Google認証も含めてローカルでテスト

3. **mainにマージする前にビルド確認**
   ```bash
   npm run build  # ビルドエラーがないか確認
   ```

### ❌ DON'T（避けるべき行動）

1. **mainブランチで直接開発しない**
   - mainへの直接push = Vercelデプロイ = 無料枠消費

2. **HTTPSでローカルアクセスしない**
   - ❌ `https://localhost:3000` → ERR_SSL_PROTOCOL_ERROR
   - ✅ `http://localhost:3000` → 正常動作

3. **developのマージ前にビルドテストを忘れない**
   - developで動いても、本番ビルドで失敗することがある

---

## 🔍 トラブルシューティング

### Q1. ローカルでGoogle認証が動かない

**症状**: ログインボタンを押してもエラーが出る

**解決策**:
1. URLが`http://localhost:3000`（HTTP）になっているか確認
2. Supabaseの設定を確認（上記参照）
3. ブラウザのキャッシュをクリア（Cmd + Shift + R）

### Q2. developブランチでもVercelにデプロイされる

**症状**: developにpushしたらVercelが反応する

**解決策**:
1. Vercel Dashboard → Settings → Build and Deployment
2. **Ignored Build Step**が正しく設定されているか確認
3. 設定コマンド:
   ```bash
   if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then exit 0; fi
   ```

### Q3. ポート3000が使用中エラー

**症状**: `EADDRINUSE: address already in use :::3000`

**解決策**:
```bash
# ポート3000を使用しているプロセスを確認
lsof -ti:3000

# プロセスを停止（PIDが表示されたら）
kill -9 <PID>

# または一発で停止
lsof -ti:3000 | xargs kill -9
```

### Q4. mainにマージ後、Vercelでビルドエラー

**症状**: developでは動いていたのに、Vercelでエラー

**解決策**:
1. developブランチに戻る
2. ローカルで`npm run build`を実行
3. エラーを修正
4. 再度mainにマージ

---

## 📊 効果測定

### Before（以前の方法）
- 10回の修正 × 10回push = **10回Vercelデプロイ**
- Vercel無料枠: 100 builds/月 → **10回消費**

### After（ブランチ戦略）
- 10回の修正 × 10回push (develop) = **0回Vercelデプロイ**
- 最後にmainにマージ = **1回Vercelデプロイ**
- Vercel無料枠: 100 builds/月 → **1回消費**

**🎉 節約率: 90%**

---

## 📚 参考ドキュメント

- [詳細セットアップガイド](./LOCAL_DEVELOPMENT_SETUP.md)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://supabase.com/dashboard/projects)

---

## ✅ 新メンバーのセットアップ手順

新しく参加したメンバーは以下を実行：

```bash
# リポジトリをクローン
git clone https://github.com/nextlevelkitamura-alt/shikumika-app.git
cd shikumika-app

# developブランチに切り替え
git checkout develop

# 依存関係をインストール
npm install

# 環境変数を設定（.env.local）
# ※既存メンバーから.env.localの内容を共有してもらう

# ローカルサーバーを起動
npm run dev

# ブラウザで確認
# http://localhost:3000 にアクセス
```

**注意**: Supabaseの設定は既に完了しているため、追加設定は不要。

---

## 📞 問い合わせ先

質問や問題があれば、以下に連絡してください:
- **Slack**: #開発チーム
- **GitHub Issues**: https://github.com/nextlevelkitamura-alt/shikumika-app/issues

---

**最終更新**: 2026年1月25日
