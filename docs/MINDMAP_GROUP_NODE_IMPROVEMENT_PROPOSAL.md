# マインドマップ グループノードUI改善提案書

**作成日**: 2026年1月25日  
**目的**: マインドマップのグループノードUIをタスクリストと統一し、一貫性のある操作性を提供

---

## 🎯 現状の問題点

### マインドマップのグループノード（現在）

```
┌─────────────────────────┐
│ [v] タスク入力項目整理    │  ← シンプルすぎる
└─────────────────────────┘
```

**表示されている要素**:
- ✅ グループ名
- ✅ 折りたたみボタン（v / >）
- ❌ 優先度（なし）
- ❌ 日時設定（なし）
- ❌ 進捗状況（なし）
- ❌ 削除ボタン（なし）
- ❌ 自動完了機能（なし）

### タスクリストのグループヘッダー（既に改善済み）

```
┌─────────────────────────────────────────────────────────────────┐
│ [✓] [v] タスク入力項目整理  ⏱ 01:30:00  1/4  [中] [×] 🎯  [1/27 09:00] [×] 📅  [+] [🗑] │
│     ↑   ↑                    ↑         ↑   ↑   ↑  ↑   ↑          ↑  ↑  ↑   ↑  ↑   │
│  チェック 折り畳み          累計時間  進捗  優先度  日時設定      追加 削除  │
│  (自動)                    (合計)         (設定可)  (設定可)                    │
└─────────────────────────────────────────────────────────────────┘
```

**表示されている要素**:
- ✅ チェックボックス（自動完了）
- ✅ 折りたたみボタン
- ✅ グループ名
- ✅ 累計時間
- ✅ 進捗（1/4）
- ✅ 優先度設定
- ✅ 日時設定
- ✅ タスク追加ボタン
- ✅ 削除ボタン

---

## 🎨 改善提案

### 提案1: ミニマル改善（推奨）⭐

**コンセプト**: マインドマップの簡潔さを保ちながら、最低限の情報を追加

```
┌─────────────────────────────────────┐
│ [✓] [v] タスク入力項目整理  1/4  [中] │
│  ↑   ↑                     ↑    ↑   │
│ チェック 折り畳み         進捗 優先度 │
└─────────────────────────────────────┘
```

**追加する要素**:
- ✅ チェックボックス（自動完了）
- ✅ 進捗表示（1/4）
- ✅ 優先度バッジ（設定されている場合のみ）

**メリット**:
- ✅ マインドマップの見やすさを維持
- ✅ 最も重要な情報（完了状態・進捗・優先度）を表示
- ✅ ノードサイズの増加を最小限に抑える
- ✅ 実装が簡単（約10-15分）

**デメリット**:
- ⚠️ 日時設定はクリック/ホバーが必要
- ⚠️ 累計時間は表示されない

---

### 提案2: フル機能版

**コンセプト**: タスクリストと完全に同じUIをマインドマップに適用

```
┌──────────────────────────────────────────────────────────────┐
│ [✓] [v] タスク入力項目整理  ⏱ 01:30:00  1/4  [中] [1/27 09:00] 📅 [+] [🗑] │
└──────────────────────────────────────────────────────────────┘
```

**追加する要素**:
- ✅ チェックボックス（自動完了）
- ✅ 累計時間
- ✅ 進捗表示（1/4）
- ✅ 優先度バッジ
- ✅ 日時表示
- ✅ 日時設定ボタン
- ✅ タスク追加ボタン
- ✅ 削除ボタン

**メリット**:
- ✅ タスクリストと完全に統一された操作性
- ✅ 全ての情報が一目で分かる

**デメリット**:
- ❌ ノードが横に長くなり、マインドマップが見づらくなる
- ❌ 情報過多で本来の「俯瞰性」が失われる
- ❌ 実装時間が長い（約30-40分）

---

### 提案3: ホバー表示版（折衷案）

**コンセプト**: 通常時は最小限、ホバー時に詳細を表示

**通常時**:
```
┌─────────────────────────────────────┐
│ [✓] [v] タスク入力項目整理  1/4  [中] │
└─────────────────────────────────────┘
```

**ホバー時**:
```
┌──────────────────────────────────────────────────────────────┐
│ [✓] [v] タスク入力項目整理  ⏱ 01:30:00  1/4  [中] [1/27 09:00] [+] [🗑] │
└──────────────────────────────────────────────────────────────┘
```

**メリット**:
- ✅ 通常時はすっきり、詳細情報も確認可能
- ✅ マインドマップの俯瞰性を維持

**デメリット**:
- ⚠️ ホバーしないと情報が見えない
- ⚠️ タッチデバイスで使いづらい
- ⚠️ 実装がやや複雑（約20-25分）

---

## 💡 推奨案: **提案1（ミニマル改善）**

### 理由

1. **マインドマップの本質を守る**
   - マインドマップは「全体を俯瞰する」ためのツール
   - 情報を詰め込みすぎると、本来の価値が失われる

2. **最も重要な情報のみ追加**
   - 完了状態（チェックボックス）: タスク管理の核心
   - 進捗（1/4）: グループの状況を一目で把握
   - 優先度: 重要なグループを識別

3. **実装コストが低い**
   - 約10-15分で完了
   - バグのリスクが低い

4. **将来的な拡張が可能**
   - まずミニマル版を実装
   - ユーザーフィードバックを得てから追加要素を検討

---

## 📊 実装内容（提案1: ミニマル改善）

### 追加する要素

#### 1. チェックボックス（自動完了）

**機能**:
- グループの全てのタスクが完了 → 自動的にチェック
- 1つでも未完了 → チェックが外れる
- 手動でチェック → 全ての子タスクも完了

**表示位置**: グループ名の左側

**実装**:
```tsx
<button
    className={cn(
        "w-4 h-4 rounded border flex items-center justify-center shrink-0 mr-2",
        isGroupCompleted 
            ? "bg-primary border-primary text-primary-foreground" 
            : "border-muted-foreground/30"
    )}
    onClick={handleGroupCheckToggle}
>
    {isGroupCompleted && <Check className="w-3 h-3" />}
</button>
```

---

#### 2. 進捗表示（1/4）

**機能**:
- 完了済みタスク数 / 全タスク数を表示
- 例: `1/4` = 4つ中1つ完了

**表示位置**: グループ名の右側

**実装**:
```tsx
<span className="text-[10px] text-muted-foreground ml-2">
    {completedCount}/{totalCount}
</span>
```

---

#### 3. 優先度バッジ（設定されている場合のみ）

**機能**:
- グループに優先度が設定されている場合のみ表示
- 例: `[中]` `[緊急]` `[高い]` `[低い]`
- クリックで優先度を変更可能

**表示位置**: 進捗の右側

**実装**:
```tsx
{data?.priority != null && (
    <PriorityPopover
        value={data.priority as Priority}
        onChange={(priority) => data.onUpdateGroup?.({ priority })}
        trigger={
            <span className="ml-2 cursor-pointer">
                <PriorityBadge value={data.priority as Priority} />
            </span>
        }
    />
)}
```

---

### UIレイアウト

```tsx
<div className="flex items-center gap-2 w-full">
    {/* Checkbox */}
    <button onClick={handleGroupCheckToggle}>
        {isGroupCompleted && <Check />}
    </button>
    
    {/* Collapse Button */}
    <button onClick={onToggleCollapse}>
        {collapsed ? '>' : 'v'}
    </button>
    
    {/* Group Name */}
    <textarea value={editValue} />
    
    {/* Progress */}
    <span className="text-[10px] text-muted-foreground">
        {completedCount}/{totalCount}
    </span>
    
    {/* Priority (if set) */}
    {priority != null && (
        <PriorityBadge value={priority} />
    )}
</div>
```

---

## 🎨 ノードサイズの調整

### Before（現在）
- 幅: 240px
- 高さ: 50px

### After（ミニマル改善）
- 幅: 280px（+40px）
- 高さ: 50px（変更なし）

**理由**: チェックボックス、進捗、優先度バッジを追加するため、横幅を若干拡大

---

## 🗂️ 修正対象ファイル

### 1. `src/components/dashboard/mind-map.tsx`

#### A. GroupNode コンポーネントの改修

**現在の構造（行318-486）**:
```tsx
const GroupNode = React.memo(({ data, selected }: NodeProps) => {
    // 編集ロジック
    return (
        <div>
            {/* 折りたたみボタン */}
            <button onClick={onToggleCollapse}>v</button>
            
            {/* グループ名 */}
            <textarea value={editValue} />
        </div>
    );
});
```

**改善後の構造**:
```tsx
const GroupNode = React.memo(({ data, selected }: NodeProps) => {
    // 自動完了ロジックを追加
    const isGroupCompleted = useMemo(() => {
        // 全ての子タスクが完了しているか確認
    }, [data?.tasks]);
    
    const handleGroupCheckToggle = useCallback(() => {
        // 全ての子タスクの状態を切り替え
    }, [data]);
    
    return (
        <div>
            {/* チェックボックス（新規） */}
            <button onClick={handleGroupCheckToggle}>
                {isGroupCompleted && <Check />}
            </button>
            
            {/* 折りたたみボタン */}
            <button onClick={onToggleCollapse}>v</button>
            
            {/* グループ名 */}
            <textarea value={editValue} />
            
            {/* 進捗（新規） */}
            <span>{completedCount}/{totalCount}</span>
            
            {/* 優先度（新規） */}
            {data?.priority != null && (
                <PriorityBadge value={data.priority} />
            )}
        </div>
    );
});
```

---

#### B. ノードデータの拡張

**現在のデータ構造**:
```typescript
{
    id: groupId,
    type: 'groupNode',
    data: {
        label: group.title,
        onSave: updateGroupTitle,
        onDelete: deleteGroup,
        onToggleCollapse: toggleGroupCollapse,
        hasChildren: true,
        collapsed: collapsedGroupIds.has(group.id)
    }
}
```

**改善後のデータ構造**:
```typescript
{
    id: groupId,
    type: 'groupNode',
    data: {
        label: group.title,
        priority: group.priority, // 新規
        tasks: groupTasks, // 新規（子タスクの配列）
        onSave: updateGroupTitle,
        onUpdateGroup: updateGroup, // 新規
        onDelete: deleteGroup,
        onToggleCollapse: toggleGroupCollapse,
        onUpdateTask: updateTask, // 新規（子タスクの更新用）
        hasChildren: true,
        collapsed: collapsedGroupIds.has(group.id)
    }
}
```

---

#### C. ノードサイズの更新

**現在（行47）**:
```typescript
const GROUP_NODE_WIDTH = 240;
```

**改善後**:
```typescript
const GROUP_NODE_WIDTH = 280; // 240 → 280 (+40px)
```

---

## ✅ 自動完了ロジック（重要）

### タスクリストと同じロジックを実装

```typescript
// 1. 全てのタスクが完了しているか確認
const isGroupCompleted = useMemo(() => {
    const tasks = data?.tasks || [];
    if (tasks.length === 0) return false;
    return tasks.every(t => t.status === 'done');
}, [data?.tasks]);

// 2. グループチェックボックスをクリックした時
const handleGroupCheckToggle = useCallback(async () => {
    const tasks = data?.tasks || [];
    const newStatus = isGroupCompleted ? 'todo' : 'done';
    
    // 全ての子タスクのステータスを更新
    for (const task of tasks) {
        await data?.onUpdateTask?.(task.id, { status: newStatus });
    }
}, [isGroupCompleted, data]);
```

---

## 🚀 実装手順

### Step 1: GroupNode コンポーネントの改修（10分）

1. `useMemo` で `isGroupCompleted` を計算
2. `handleGroupCheckToggle` を実装
3. チェックボックスUIを追加
4. 進捗表示を追加
5. 優先度バッジを追加（条件付き）

### Step 2: ノードデータの拡張（3分）

1. `groupTasks` をフィルタリング
2. ノードデータに `tasks`, `priority`, `onUpdateGroup`, `onUpdateTask` を追加

### Step 3: ノードサイズの調整（1分）

1. `GROUP_NODE_WIDTH` を 240 → 280 に変更

### Step 4: テスト（3分）

1. グループノードにチェックボックスが表示されるか
2. 子タスクを全て完了すると、グループノードも自動完了するか
3. グループノードを手動完了すると、全ての子タスクも完了するか
4. 進捗が正しく表示されるか
5. 優先度が設定されている場合のみ、バッジが表示されるか

**合計所要時間**: 約17分

---

## 📊 期待される効果

### Before（現在）
```
タスクリスト: [✓] [v] タスク入力項目整理  1/4  [中]  ← リッチ
マインドマップ: [v] タスク入力項目整理        ← シンプルすぎ
```
**問題**: 両者で機能と情報量に大きな差がある

### After（ミニマル改善）
```
タスクリスト: [✓] [v] タスク入力項目整理  1/4  [中]  ← リッチ
マインドマップ: [✓] [v] タスク入力項目整理  1/4  [中]  ← 最低限の情報を追加
```
**改善**: 一貫性のある操作感、最も重要な情報は両方で確認可能

---

## ⚠️ 注意事項

### 1. マインドマップの性質を尊重

**やるべきこと**:
- ✅ 最小限の情報追加
- ✅ ノードサイズの増加を抑える
- ✅ 俯瞰性を維持

**やってはいけないこと**:
- ❌ タスクリストと全く同じUIにする
- ❌ 情報を詰め込みすぎる
- ❌ ノードを大きくしすぎる

### 2. パフォーマンス

**問題**: 子タスクのリストを各ノードに渡すと、データ量が増える

**対策**:
- ノードデータは必要最小限に
- `useMemo` でメモ化
- 不要な再レンダリングを防ぐ

### 3. 既存機能の保護

**重要**: 既存の編集機能、IME対応、フォーカス管理を壊さない

**テスト項目**:
- ✅ グループ名の編集が正常に動作する
- ✅ IMEで日本語入力できる
- ✅ F2キーで編集モードに入れる
- ✅ Enterキーで保存できる
- ✅ Escapeキーでキャンセルできる

---

## 📅 将来的な拡張（オプション）

ユーザーフィードバックに基づいて、以下を検討:

### フェーズ2: 日時表示の追加

```
[✓] [v] タスク入力項目整理  1/4  [中]  [1/27 09:00]
```

### フェーズ3: 累計時間の追加

```
[✓] [v] タスク入力項目整理  ⏱ 01:30:00  1/4  [中]
```

### フェーズ4: ホバー時の詳細表示

通常時: 最小限
ホバー時: 全ての情報を表示

---

## ✅ 完了基準

### 動作確認

1. ✅ グループノードにチェックボックスが表示される
2. ✅ 全ての子タスク完了 → グループノードも自動完了
3. ✅ グループノード手動完了 → 全ての子タスクも完了
4. ✅ 進捗（1/4）が正しく表示される
5. ✅ 優先度が設定されている場合のみ、バッジが表示される
6. ✅ 優先度バッジをクリックして変更できる
7. ✅ グループ名の編集が正常に動作する
8. ✅ マインドマップの俯瞰性が維持されている

---

## 🎯 まとめ

### 推奨: 提案1（ミニマル改善）

**追加する要素**:
1. ✅ チェックボックス（自動完了）
2. ✅ 進捗表示（1/4）
3. ✅ 優先度バッジ（設定時のみ）

**所要時間**: 約17分

**効果**:
- マインドマップとタスクリストの一貫性向上
- 最も重要な情報（完了状態・進捗・優先度）を一目で確認可能
- マインドマップの俯瞰性を維持

---

**最終更新**: 2026年1月25日
