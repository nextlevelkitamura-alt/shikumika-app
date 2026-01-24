# Priority Sync Fix Plan
**作成日**: 2026-01-25  
**目的**: マインドマップとタスクの優先度削除を同期させる

---

## 📋 問題点

### 現在の問題
- ✅ タスクリストで優先度削除 → 正しくアイコン表示（🎯）に戻る
- ❌ マインドマップで優先度削除 → 「中」として残ってしまう

### 期待される動作
- マインドマップで優先度削除 → タスクリストと同じくアイコン表示（🎯）に戻る
- 優先度が `NULL` として扱われる

---

## 🔍 原因分析

### 1. デフォルト値の問題

#### mind-map.tsx のノードデータ生成
```tsx
// 現在のコード（問題あり）
data: {
    priority: task.priority ?? 3,  // ← デフォルト値が設定される
    // ...
}
```

**問題**: `task.priority` が `null` または `undefined` の場合、自動的に `3`（中）が設定される

### 2. 条件分岐の問題

#### TaskNode の表示ロジック
```tsx
// 現在のコード
{data?.priority ? (
    // 設定済み表示
) : (
    // 未設定表示
)}
```

**問題**: `priority = 3` の場合、truthy として扱われるため、常に「設定済み」として表示される

### 3. 更新処理の問題

#### onUpdatePriority の型
```tsx
onUpdatePriority?: (priority: number) => void
```

**問題**: `null` や `undefined` を受け取れない可能性

---

## 🔧 修正内容

### Phase 1: mind-map.tsx のノードデータ生成を修正

#### Before（現在）:
```tsx
data: {
    priority: (task as any).priority ?? 3,  // デフォルト値を設定
    // ...
}
```

#### After（修正後）:
```tsx
data: {
    priority: (task as any).priority,  // デフォルト値なし
    // ...
}
```

**変更点**: `?? 3` を削除し、`null` / `undefined` をそのまま渡す

---

### Phase 2: TaskNode の条件分岐を修正

#### Before（現在）:
```tsx
{data?.priority ? (
    // 設定済み表示
) : (
    // 未設定表示
)}
```

#### After（修正後）:
```tsx
{data?.priority != null ? (
    // 設定済み表示
) : (
    // 未設定表示
)}
```

**変更点**: `data?.priority` → `data?.priority != null`

**理由**: 
- `priority = 0` の場合でも falsy として扱われるのを防ぐ
- `null` と `undefined` を明示的にチェック

---

### Phase 3: PriorityPopover の初期値を修正

#### Before（現在）:
```tsx
<PriorityPopover
    value={3}  // 未設定時のデフォルト
    onChange={(priority) => data?.onUpdatePriority?.(priority)}
    trigger={<button>🎯</button>}
/>
```

#### After（修正後）:
```tsx
<PriorityPopover
    value={3}  // ポップオーバーメニュー内のデフォルト選択のみ
    onChange={(priority) => data?.onUpdatePriority?.(priority)}
    trigger={<button>🎯</button>}
/>
```

**変更点**: なし（このロジックは正しい）

**理由**: 未設定時にポップオーバーを開いた際、「中」がデフォルトで選択されているのは正常

---

### Phase 4: tasksJson の生成を修正

#### Before（現在）:
```tsx
const tasksJson = JSON.stringify(tasks?.map(t => ({
    // ...
    priority: (t as any)?.priority ?? 3  // デフォルト値を設定
})) ?? []);
```

#### After（修正後）:
```tsx
const tasksJson = JSON.stringify(tasks?.map(t => ({
    // ...
    priority: (t as any)?.priority  // デフォルト値なし
})) ?? []);
```

**変更点**: `?? 3` を削除

---

## 📊 Before / After 比較

### Before（現在の動作）

#### マインドマップで優先度削除
```
1. × ボタンをクリック
2. onUpdatePriority(undefined) が実行される
3. DBで priority = NULL として保存される
4. マインドマップが再レンダリング
5. ノードデータ生成時: priority: task.priority ?? 3
6. priority = 3 として表示される ← 問題！
```

### After（修正後の動作）

#### マインドマップで優先度削除
```
1. × ボタンをクリック
2. onUpdatePriority(undefined) が実行される
3. DBで priority = NULL として保存される
4. マインドマップが再レンダリング
5. ノードデータ生成時: priority: task.priority
6. priority = null として扱われる
7. data?.priority != null → false
8. アイコン（🎯）のみ表示される ← 正しい！
```

---

## 🎯 実装順序

### Phase 1: mind-map.tsx のノードデータ生成を修正
1. `priority: (task as any).priority ?? 3` → `priority: (task as any).priority`
2. `priority: (t as any)?.priority ?? 3` → `priority: (t as any)?.priority`

### Phase 2: TaskNode の条件分岐を修正
1. `{data?.priority ? (` → `{data?.priority != null ? (`

### Phase 3: 動作確認
1. マインドマップで優先度を設定
2. × ボタンで優先度を削除
3. アイコン（🎯）のみ表示されることを確認
4. タスクリストでも同じ動作を確認

---

## 🎨 視覚的イメージ

### マインドマップ

#### Before（問題あり）
```
1. [タスクA] [中] [×] [🎯]  ← 優先度設定済み
2. × ボタンをクリック
3. [タスクA] [中] [×] [🎯]  ← 削除されない（問題）
```

#### After（修正後）
```
1. [タスクA] [中] [×]  ← 優先度設定済み
2. × ボタンをクリック
3. [タスクA] [🎯]  ← アイコンのみに戻る（正しい）
```

---

## ⚠️ 注意事項

1. **デフォルト値の削除**
   - `?? 3` を削除することで、`null` / `undefined` がそのまま渡される
   - 条件分岐を `!= null` に変更することで、正しく判定される

2. **既存タスクへの影響**
   - 既に `priority = 3` が設定されているタスクは影響を受けない
   - 新規タスクは `priority = null` として作成される（Supabase SQLを実行済みの場合）

3. **Supabase SQL の実行**
   - `ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT NULL;` を実行済みであること
   - 実行していない場合、新規タスクは `priority = 3` として作成される

---

## ✅ 完了条件

- [ ] Phase 1: mind-map.tsx のノードデータ生成を修正
  - [ ] `priority: (task as any).priority ?? 3` → `priority: (task as any).priority`
  - [ ] `priority: (t as any)?.priority ?? 3` → `priority: (t as any)?.priority`
- [ ] Phase 2: TaskNode の条件分岐を修正
  - [ ] `{data?.priority ? (` → `{data?.priority != null ? (`
- [ ] Phase 3: 動作確認
  - [ ] マインドマップで優先度削除 → アイコンのみ表示
  - [ ] タスクリストで優先度削除 → アイコンのみ表示
  - [ ] 両方で同じ動作を確認

---

この計画で実装を進めます。
