# Priority Optional Feature Implementation Plan
**作成日**: 2026-01-25  
**目的**: 優先度をオプション化し、カレンダーと同じUXにする

---

## 📋 要件

### 現在の問題点
- ✅ 実装完了: 全てのタスクに優先度が常に表示されている
- ❌ 問題: タスクリストとマインドマップが複雑に見える
- ❌ 問題: 優先度を設定したくないタスクにも表示される

### 改善要望
- 優先度が未設定の場合は、アイコンのみ表示
- アイコンをクリックして優先度を設定
- 優先度を設定したら、詳細（例: `🟡 中`）が表示される
- 優先度を削除できるボタン（×）を追加
- **カレンダーと同じUX**

---

## 🎯 目標UX（カレンダーと同じパターン）

### A. タスクリスト（center-pane.tsx）

#### 優先度未設定時
```
[タスク名] ⏱ 00:15:00 [▶ フォーカス] [🎯] [1/26 09:45] [×] [📅]
                                        ↑
                                   グレーのアイコン（hover時表示）
```

#### 優先度設定済み時
```
[タスク名] ⏱ 00:15:00 [▶ フォーカス] [中] [×] [🎯] [1/26 09:45] [×] [📅]
                                        ↑   ↑   ↑
                                      黄色  削除 グレー→カラー
```

**注**: `[中]` は黄色の背景色付きテキスト、絵文字なし

### B. マインドマップ（mind-map.tsx）

#### 優先度未設定時
```
[タスク名] [🎯] [1/26 09:45] [×] [📅]
            ↑
       グレーのアイコン
```

#### 優先度設定済み時
```
[タスク名] [中] [×] [🎯] [1/26 09:45] [×] [📅]
            ↑   ↑   ↑
          黄色  削除 カラー
```

**注**: `[中]` は黄色の背景色付きテキスト、絵文字なし

---

## 🎨 デザイン詳細

### アイコン選定

#### 採用: 🎯（ターゲット）
- **デザイン**: シンプルなターゲットマーク
- **カラー**: グレー（カレンダーアイコンと同じトーン）
- **理由**: モダンで目立たない、シンプル

**実装**:
```tsx
// 絵文字として表示（カラーはCSSで制御）
<span className="text-zinc-500">🎯</span>  // 未設定時
<span className="text-red-500">🎯</span>   // 緊急
<span className="text-orange-500">🎯</span> // 高い
<span className="text-yellow-500">🎯</span> // 中
<span className="text-blue-500">🎯</span>  // 低い
```

### カラーリング

#### 未設定時（アイコンのみ）
```tsx
// グレー（カレンダーと同じ）
text-zinc-500 hover:text-zinc-400
```

#### 設定済み時（テキストバッジ + 削除ボタン + アイコン）
```tsx
// テキストバッジ（絵文字なし、コンパクト）
緊急 - text-white bg-red-500/90 px-1.5 py-0.5 rounded text-[10px]
高い - text-white bg-orange-500/90 px-1.5 py-0.5 rounded text-[10px]
中   - text-white bg-yellow-500/90 px-1.5 py-0.5 rounded text-[10px]
低い - text-white bg-blue-500/90 px-1.5 py-0.5 rounded text-[10px]

// 削除ボタン: グレー → 赤（hover時）
text-zinc-500 hover:text-red-400

// アイコン: 優先度に応じた色（カラフル）
text-red-500 / text-orange-500 / text-yellow-500 / text-blue-500
```

**デザインの特徴**:
- 絵文字なし（シンプル）
- テキストのみ（「緊急」「高い」「中」「低い」）
- 背景色で優先度を表現
- コンパクト（`text-[10px]`, `px-1.5 py-0.5`）
- 幅を取らない

---

## 🗄️ データベース設計

### 優先度の扱い

#### 現在
```sql
priority integer default 3  -- 1-5
```
- デフォルト: 3（中）
- 全てのタスクに優先度が設定される

#### 変更後
```sql
priority integer default NULL  -- 1-4, NULL = 未設定
```
- デフォルト: `NULL`（未設定）
- 優先度は任意設定

### マイグレーション

#### SQL（既存タスクの優先度をNULLに変更）
```sql
-- オプション: 既存の priority = 3 をNULLに変更する場合
-- UPDATE tasks SET priority = NULL WHERE priority = 3;

-- デフォルト値をNULLに変更
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT NULL;
```

**注意**: 既存タスクの優先度を保持する場合、このマイグレーションは不要です。

---

## 🔧 実装内容

### Phase 1: データベースのデフォルト値変更

#### ファイル: `supabase/priority_optional_migration.sql`（新規作成）
```sql
-- Priority Optional Feature Migration
-- Change default priority from 3 to NULL

ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT NULL;

-- Optional: Clear existing default priorities (priority = 3)
-- Uncomment if you want to reset all "medium" priorities to NULL
-- UPDATE tasks SET priority = NULL WHERE priority = 3;
```

### Phase 2: コンポーネントの修正

#### A. center-pane.tsx

##### Before（現在の実装）:
```tsx
{/* Group 2: Priority */}
<PrioritySelect
    value={(task.priority as Priority) || 3}
    onChange={(priority) => onUpdateTask?.(task.id, { priority })}
/>
```

##### After（修正後）:
```tsx
{/* Group 2: Priority */}
<div className="flex items-center gap-1">
    {task.priority ? (
        <>
            {/* Priority Badge */}
            <PriorityBadge value={task.priority as Priority} />
            
            {/* Clear Button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 text-zinc-500 hover:text-red-400 transition-colors"
                onClick={(e) => {
                    e.stopPropagation()
                    onUpdateTask?.(task.id, { priority: null })
                }}
                title="優先度を削除"
            >
                <X className="w-3 h-3" />
            </Button>
            
            {/* Priority Icon (clickable) */}
            <PriorityPopover
                value={task.priority as Priority}
                onChange={(priority) => onUpdateTask?.(task.id, { priority })}
                trigger={
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-6 w-6 transition-colors",
                            getPriorityIconColor(task.priority as Priority)
                        )}
                        title="優先度を変更"
                    >
                        🎯
                    </Button>
                }
            />
        </>
    ) : (
        /* Priority not set: Icon only */
        <PriorityPopover
            value={3} // Default to "medium" in menu
            onChange={(priority) => onUpdateTask?.(task.id, { priority })}
            trigger={
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-500 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="優先度を設定"
                >
                    🎯
                </Button>
            }
        />
    )}
</div>
```

#### B. mind-map.tsx

##### Before（現在の実装）:
```tsx
{/* Priority Popover */}
<PriorityPopover
    value={(data?.priority as Priority) || 3}
    onChange={(priority) => data?.onUpdatePriority?.(priority)}
/>
```

##### After（修正後）:
```tsx
{/* Priority Group */}
<div className="flex items-center gap-1">
    {data?.priority ? (
        <>
            {/* Priority Badge */}
            <PriorityBadge value={data.priority as Priority} />
            
            {/* Clear Button */}
            <button
                className="p-0.5 rounded text-zinc-500 hover:text-red-400 transition-colors"
                onClick={(e) => {
                    e.stopPropagation()
                    data?.onUpdatePriority?.(null)
                }}
                title="優先度を削除"
            >
                <X className="w-2.5 h-2.5" />
            </button>
            
            {/* Priority Icon */}
            <PriorityPopover
                value={data.priority as Priority}
                onChange={(priority) => data?.onUpdatePriority?.(priority)}
                trigger={
                    <button 
                        className={cn(
                            "p-0.5 rounded transition-colors",
                            getPriorityIconColor(data.priority as Priority)
                        )}
                        title="優先度を変更"
                    >
                        🎯
                    </button>
                }
            />
        </>
    ) : (
        /* Priority not set: Icon only */
        <PriorityPopover
            value={3}
            onChange={(priority) => data?.onUpdatePriority?.(priority)}
            trigger={
                <button 
                    className="p-0.5 rounded text-zinc-500 hover:text-zinc-400 transition-colors"
                    title="優先度を設定"
                >
                    🎯
                </button>
            }
        />
    )}
</div>
```

### Phase 3: ヘルパー関数の追加

#### ファイル: `src/components/ui/priority-select.tsx`

```tsx
// Get icon color based on priority
export function getPriorityIconColor(priority: Priority): string {
    const option = PRIORITY_OPTIONS[priority]
    return option.color
}
```

### Phase 4: PriorityPopover の trigger プロップ対応

#### 現在の実装
`PriorityPopover` は `trigger` プロップを受け取っていません。

#### 修正
`PriorityPopover` に `trigger?: React.ReactNode` を追加し、`DateTimePicker` と同じ仕組みにする。

```tsx
export function PriorityPopover({
    value,
    onChange,
    trigger, // 追加
    className,
}: {
    value: Priority
    onChange: (value: Priority) => void
    trigger?: React.ReactNode // 追加
    className?: string
}) {
    const [open, setOpen] = React.useState(false)
    const option = PRIORITY_OPTIONS[value]

    const handleSelect = (newValue: Priority) => {
        onChange(newValue)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger || ( // trigger がある場合は使用
                    <button
                        type="button"
                        className={cn(
                            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                            option.color,
                            option.bgColor,
                            option.hoverColor,
                            "ring-1",
                            option.ringColor,
                            className
                        )}
                    >
                        <span className="text-xs">{option.icon}</span>
                        <span>{option.label}</span>
                    </button>
                )}
            </PopoverTrigger>
            <PopoverContent ... >
                {/* ... existing content ... */}
            </PopoverContent>
        </Popover>
    )
}
```

### Phase 5: 型定義の更新

#### onUpdatePriority の型
```tsx
onUpdatePriority?: (priority: number | null) => void
```

`null` を受け入れるように変更。

---

## 📊 データフロー

### 優先度未設定 → 設定

1. ユーザーが 🎯 アイコンをクリック
2. ポップオーバーメニューが表示
3. 優先度（例: 🟡 中）を選択
4. `onUpdateTask({ priority: 3 })` が実行
5. DBに保存
6. UIが更新: [🟡 中] [×] [🎯] が表示

### 優先度設定済み → 削除

1. ユーザーが × ボタンをクリック
2. `onUpdateTask({ priority: null })` が実行
3. DBに保存（`priority = NULL`）
4. UIが更新: [🎯] のみ表示

---

## 🎯 実装順序

### Phase 1: データベースのデフォルト値変更
1. `supabase/priority_optional_migration.sql` を作成
2. Supabaseで実行

### Phase 2: priority-select.tsx の修正
1. `getPriorityIconColor` 関数を追加
2. `PriorityPopover` に `trigger` プロップを追加

### Phase 3: center-pane.tsx の修正
1. 優先度未設定時のレイアウトを実装
2. 優先度設定済み時のレイアウトを実装
3. × ボタンの実装

### Phase 4: mind-map.tsx の修正
1. 優先度未設定時のレイアウトを実装
2. 優先度設定済み時のレイアウトを実装
3. × ボタンの実装
4. `onUpdatePriority` の型を `number | null` に変更

### Phase 5: 動作確認
1. 新規タスク作成 → 優先度未設定（🎯 アイコンのみ）
2. 🎯 アイコンをクリック → ポップオーバー表示
3. 優先度を選択 → バッジ + × + 🎯 表示
4. × ボタンをクリック → 優先度削除 → 🎯 アイコンのみ
5. 既存タスクの優先度が保持される

---

## 🎨 視覚的イメージ

### タスクリスト

#### 優先度未設定
```
┌────────────────────────────────────────────────┐
│ ☐ [タスクA] ⏱ 00:15:00 [▶] [🎯] [1/26 09:45] │
│                              ↑                 │
│                         グレーアイコン          │
└────────────────────────────────────────────────┘
```

#### 優先度設定済み
```
┌────────────────────────────────────────────────┐
│ ☐ [タスクB] ⏱ 00:15:00 [▶] [中][×][🎯] [1/26]│
│                              ↑  ↑  ↑          │
│                            黄色 削除 カラー     │
└────────────────────────────────────────────────┘
```

**注**: `[中]` は白文字 + 黄色背景、コンパクト

### マインドマップ

#### 優先度未設定
```
┌──────────────────────────┐
│ [タスクA]                │
│ [🎯] [1/26 09:45] [📅] │
│  ↑                       │
│ グレー                   │
└──────────────────────────┘
```

#### 優先度設定済み
```
┌──────────────────────────────┐
│ [タスクB]                    │
│ [中][×][🎯] [1/26] [📅]    │
│  ↑  ↑  ↑                    │
│ 黄色 削除 カラー              │
└──────────────────────────────┘
```

**注**: `[中]` は白文字 + 黄色背景、コンパクト

---

## ⚠️ 注意事項

1. **既存タスクとの互換性**
   - 既存のタスクで `priority = 3` のものは、設定済みとして扱う
   - `priority = NULL` の新規タスクは、未設定として扱う

2. **デフォルト値**
   - 新規タスク作成時: `priority = NULL`（未設定）
   - ポップオーバーのデフォルト選択: 「中」（value = 3）

3. **× ボタンの動作**
   - `e.stopPropagation()` を必ず呼ぶ（ポップオーバーが開かないように）

4. **アイコンの選定**
   - 🎯（ターゲット）を推奨
   - ユーザーからの要望があれば変更可能

5. **カレンダーとの統一感**
   - 同じレイアウトパターン: [詳細] [×] [アイコン]
   - 同じカラーリング: 未設定=グレー、設定済み=カラー

---

## ✅ 完了条件

- [ ] Phase 1: データベースのデフォルト値を `NULL` に変更
- [ ] Phase 2: `priority-select.tsx` の修正
  - [ ] `getPriorityIconColor` 関数追加
  - [ ] `PriorityPopover` に `trigger` プロップ追加
- [ ] Phase 3: `center-pane.tsx` の修正
  - [ ] 優先度未設定時のレイアウト実装
  - [ ] 優先度設定済み時のレイアウト実装
  - [ ] × ボタンの実装
- [ ] Phase 4: `mind-map.tsx` の修正
  - [ ] 優先度未設定時のレイアウト実装
  - [ ] 優先度設定済み時のレイアウト実装
  - [ ] × ボタンの実装
- [ ] Phase 5: 動作確認
  - [ ] 新規タスクで優先度未設定（🎯 のみ）
  - [ ] 優先度設定後、バッジ + × + 🎯 表示
  - [ ] × ボタンで優先度削除
  - [ ] 既存タスクの優先度が保持される

---

この計画で実装を進めます。
