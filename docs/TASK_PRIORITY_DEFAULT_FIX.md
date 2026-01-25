# タスク優先度デフォルト値修正計画

**作成日**: 2026年1月25日  
**目的**: 新規タスク作成時に優先度が自動設定されないようにし、UIをすっきり保つ

---

## 🎯 問題点

### 現状

**新規タスク作成時**:
```typescript
// 現在の動作（推測）
createTask(groupId, "New Task") 
  ↓
priority: 3 (中) が自動設定される
  ↓
UIに [中] [×] 🎯 が表示される
```

**結果**:
- 画面が煩雑になる
- ユーザーが設定していないのに、優先度が表示される
- 日時設定と一貫性がない（日時は未設定状態から始まる）

---

## ✅ 期待される動作

### 新規タスク作成時

```typescript
createTask(groupId, "New Task") 
  ↓
priority: null (未設定)
  ↓
UIには何も表示しない（すっきり）
  ↓
ホバー時のみ 🎯 アイコンを表示（設定可能を示す）
```

### 優先度設定後

```typescript
ユーザーが優先度を設定
  ↓
priority: 2 (高い)
  ↓
UIに [高い] [×] 🎯 が表示される
```

---

## 🔍 原因の調査

### 可能性1: `createTask`でデフォルト値を設定している

**場所**: `src/hooks/useMindMapSync.ts` の `createTask` 関数

```typescript
// 問題のあるコード（推測）
const { data, error } = await supabase.from('tasks').insert({
  title,
  group_id: groupId,
  priority: 3, // ← ここが原因？
  ...
})
```

### 可能性2: Supabaseのテーブル定義でデフォルト値が設定されている

**場所**: `tasks` テーブルの `priority` カラム

```sql
-- 問題のあるスキーマ（推測）
priority INTEGER DEFAULT 3
```

---

## 🔧 修正内容

### Phase 1: コード側の修正（優先）

#### 1-1. `useMindMapSync.ts` の `createTask` 関数

**Before（推測）**:
```typescript
const { data, error } = await supabase.from('tasks').insert({
  user_id: userId,
  group_id: groupId,
  parent_task_id: parentTaskId ?? null,
  title: title ?? 'New Task',
  priority: 3, // ← これを削除
  status: 'todo',
  order_index: newOrderIndex
})
```

**After**:
```typescript
const { data, error } = await supabase.from('tasks').insert({
  user_id: userId,
  group_id: groupId,
  parent_task_id: parentTaskId ?? null,
  title: title ?? 'New Task',
  // priority を指定しない → null になる
  status: 'todo',
  order_index: newOrderIndex
})
```

**効果**:
- 新規タスクは `priority: null` で作成される
- UIに優先度が表示されない
- すっきりした画面を維持

---

### Phase 2: データベース側の確認（必要に応じて）

#### 2-1. `tasks` テーブルのスキーマ確認

```sql
-- 現在のデフォルト値を確認
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'priority';
```

#### 2-2. デフォルト値が設定されている場合、削除

```sql
-- デフォルト値を削除
ALTER TABLE tasks 
ALTER COLUMN priority DROP DEFAULT;
```

**ただし**: コード側で対応すれば、DB側の変更は不要

---

## 🗂️ 修正対象ファイル

### 1. `src/hooks/useMindMapSync.ts`

**修正内容**:
- `createTask` 関数から `priority` の初期値設定を削除
- 明示的に指定されていない限り、`priority` を含めない

**変更箇所**:
```typescript
// 現在のコードを確認して、priority の設定があれば削除
const { data, error } = await supabase.from('tasks').insert({
  // priority: 3, ← これがあれば削除
})
```

---

## ✅ 完了基準

### 動作確認

1. ✅ 新しいタスクを作成する
2. ✅ 優先度バッジ・削除ボタンが**表示されない**
3. ✅ タスク行をホバーすると、グレーの `🎯` アイコンが表示される
4. ✅ `🎯` アイコンをクリックして優先度を設定
5. ✅ 優先度バッジ `[中]` と削除ボタン `[×]` が表示される
6. ✅ 削除ボタンをクリックすると、優先度が削除され、アイコンのみに戻る

---

## 📊 UIの比較

### Before（現在の問題）

```
[✓] New Task  ⏱ 00:00:03  [▶ フォーカス]  [中] [×] 🎯  [+] [🗑]
    ↑ 優先度が自動設定されている
```

### After（期待）

```
[✓] New Task  ⏱ 00:00:03  [▶ フォーカス]  (ホバー: 🎯)  [+] [🗑]
    ↑ すっきり
```

**優先度設定後**:
```
[✓] New Task  ⏱ 00:00:03  [▶ フォーカス]  [中] [×] 🎯  [+] [🗑]
```

---

## 🚀 実装手順

### Step 1: コードを確認（1分）
- `useMindMapSync.ts` の `createTask` を読み込む
- `priority` が設定されているか確認

### Step 2: 修正（1分）
- `priority: 3` などの記述があれば削除
- `priority` を指定しない

### Step 3: テスト（1分）
- 新しいタスクを作成
- 優先度が表示されないことを確認

**合計所要時間**: 約3分

---

## 📝 注意事項

### 既存タスクについて

**問題**: 既に作成済みのタスクで `priority: 3` になっているものがある

**対策**:
- 手動で優先度を削除する（×ボタンをクリック）
- または、SQLで一括削除:
  ```sql
  UPDATE tasks SET priority = NULL WHERE priority = 3;
  ```

ただし、ユーザーが明示的に「中」を設定したタスクも削除されてしまうので、**推奨しない**

---

## ✅ チェックリスト

実装完了後、以下を確認:

- [ ] 新規タスク作成時、優先度バッジが表示されない
- [ ] ホバー時にグレーの🎯アイコンが表示される
- [ ] 🎯アイコンをクリックして優先度を設定できる
- [ ] 優先度設定後、バッジと削除ボタンが表示される
- [ ] 削除ボタンで優先度を削除できる
- [ ] グループタスクも同様に動作する（優先度が未設定で作成される）

---

**最終更新**: 2026年1月25日
