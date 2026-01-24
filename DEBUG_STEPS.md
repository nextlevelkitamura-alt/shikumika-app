# カレンダー Hydration Error デバッグ手順

## ステップ1: 開発サーバーを再起動して詳細エラーを確認

### 1-1. ターミナルで開発サーバーを停止
```bash
# Ctrl+C で停止
```

### 1-2. キャッシュをクリアして再起動
```bash
cd "/Users/kitamuranaohiro/Private/P dev/shikumika-app"
rm -rf .next
npm run dev
```

### 1-3. ブラウザでアクセスして、コンソールのエラーを確認
- **Minified版ではなく、詳細なエラーメッセージ**が表示されるはず
- エラーメッセージに「Expected server HTML to contain...」のような具体的な内容が含まれている

---

## ステップ2: エラーメッセージの内容を確認

以下の情報を教えてください：
1. コンソールに **"Expected server HTML"** という文字列が含まれているか？
2. 含まれている場合、その**前後の内容**（どのテキストが期待されて、どのテキストが実際にあったか）
3. エラーが出ている**ファイル名や行番号**（スタックトレースから）

---

## ステップ3: 最小限カレンダーでテスト

もしステップ1-2で詳細なエラーが出ない場合、または react-day-picker が原因と判明した場合：
→ 私が最小限のシンプルカレンダーを作成して、表示テストを行います。

---

## 現在の状況まとめ

### 試した対策（すべて効果なし）
1. ✅ Calendar を dynamic import (ssr: false)
2. ✅ DateTimePicker を dynamic import (ssr: false)
3. ✅ formatCaption を削除
4. ✅ isMounted ガードで PopoverContent を条件付きレンダリング
5. ✅ Popover 全体を isMounted で保護
6. ✅ mind-map.tsx と center-pane.tsx でも DateTimePicker を dynamic import

### 判明している事実
- エラーは **React #418 (Hydration Error)**
- エラーメッセージ: `args[]=text&args[]=` → **テキストノードの不一致**
- 「0.2秒ほど横長の表示が見える」→ カレンダーは一瞬レンダリングされるが、その後破壊される

### 次の戦略
1. **開発モードで詳細エラーを確認**（ステップ1）
2. **react-day-picker を使わずにシンプルなグリッドで表示テスト**（ステップ3）
3. **MindMap コンポーネント全体を dynamic import**（最終手段）
