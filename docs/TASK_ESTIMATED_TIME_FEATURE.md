# タスク見積もり時間機能 実装計画書

**作成日**: 2026年1月25日  
**目的**: タスクごとに見積もり時間を設定し、作業計画を立てやすくする

---

## 🎯 機能概要

### 目的

**タスクの見積もり時間を設定できるようにする**

- ユーザーがタスクにかかる時間を事前に見積もる
- 選択肢から簡単に設定できる
- 設定されていない場合は非表示（すっきり保つ）

### ✅ 追加仕様（重要）: 「親タスクへの統合」ルール

**結論**: `タスクC-1` や `タスクC-2` を集計して **`タスクC` に統合表示**する（= 親に時間を“持たせる”のではなく“集計結果を表示”する）

- **子を持つタスク（親タスク）**:
  - 表示: **子孫（全階層）の合計**を表示（例: `⏲ 2.5時間`）
  - 入力: **親タスク側でも手動上書き可能**（自動集計は絶対ではない）
    - 例: 子孫合計 `2.5時間` → 親タスクで `3時間` に上書き（バッファを足す等）
    - 上書き解除（×）で自動集計に戻す
  - 役割: “箱”として階層を構造化しつつ、必要なら見積もりの最終値を調整できる
- **子を持たないタスク（葉タスク）**:
  - 入力: 見積もり時間を設定できる（5/15/30/45/60/120分）
  - 表示: 自身の見積もり時間を表示

**二重計上を防ぐルール**:
- 「子を持つタスクは、**“自動集計値”と“上書き値”のどちらか一方**を“そのサブツリーの値”として採用する」  
  - 自動モード: 子孫合計（全階層）を採用  
  - 上書きモード: 親タスクの手動値を採用（子孫合計は採用しない）  
  → これにより、上書きしても二重計上にならない

### 🆕 親タスク（グループ）の自動計算

**子タスクの見積もり時間を合計して、親タスクの見積もり時間を自動設定**

- **子タスクの合計が自動的に親タスクの見積もり時間になる**
- 例：
  - 子タスクA: 30分
  - 子タスクB: 45分
  - 子タスクC: 15分
  - → **親タスク: 90分（1時間30分）自動表示**

**メリット**:
- プロジェクト全体の所要時間が一目で分かる
- 子タスクを追加・変更すると親タスクの時間も自動更新
- 手動計算不要で効率的

---

## 🎨 UI設計

### レイアウト（タスクリスト）

#### 通常タスク（子タスク）

```
[✓] タスク名  ⏱ 00:15:00  [▶ フォーカス]  [⏲ 30分]  [×]  [中]  [×]  🎯  [1/27 09:00]  [×]  📅  [+]  [🗑]
              ↑             ↑              ↑          ↑
           実績時間      フォーカス     見積もり時間  削除
          (既存)         (既存)         (新規)      (新規)
```

**配置場所**: 
- フォーカスボタンの右側
- 優先度の左側

**設定時**: `[⏲ 30分]` のように表示
**未設定時**: 何も表示しない（ホバー時にアイコンのみ）

---

#### 親タスク（タスク内の親: 例 `タスクC`）- **統合表示（子孫合計）**

```
[✓] タスクC  ⏱ 00:10:00  [▶ フォーカス]  [⏲ 2.5時間]  ...（優先度/日時など）
                           ↑
                   子孫（C-1, C-2, ...）の合計
```

**特徴**:
- デフォルトは**子孫合計を自動表示**
- バッジクリックで**手動上書き**できる（上書き中は `×` で自動に戻す）
- 子タスク（葉）側に時間を入れるだけで親の表示が自動更新される（自動モードの場合）

---

#### 親タスク（グループ）- **自動計算表示**

```
[✓] タスク入力項目整理  ⏱ 01:30:00  [▶ フォーカス]  [⏲ 1時間30分]  [中]  [×]  🎯  [1/27 09:00]  [×]  📅  [+]  [🗑]
                        ↑             ↑              ↑
                    累計実績時間    フォーカス    子タスクの見積もり時間の合計
                     (既存)         (既存)         (自動計算・新規)
```

**特徴**:
- **子タスクの見積もり時間の合計**を自動表示
- **削除ボタン（×）なし**（自動計算のため手動削除不可）
- **クリック不可**（編集は子タスクで行う）
- **子タスクがない場合**: 何も表示しない
- **子タスクで1つでも見積もり時間が設定されている場合**: 合計を表示

**自動更新**:
- 子タスクに見積もり時間を設定 → 親タスクの合計に反映
- 子タスクの見積もり時間を変更 → 親タスクの合計も自動更新
- 子タスクの見積もり時間を削除 → 親タスクの合計から除外

---

### レイアウト（マインドマップ）

**グループノード**（累計時間を自動表示）:
```
[✓] タスク入力項目整理  ⏲ 1時間30分  [中]  1/27 09:00  [v]
                        ↑
                   累計見積もり時間
              (子タスクの合計・自動計算)
```

**特徴**:
- **子タスクの見積もり時間の合計**を自動表示
- **クリック不可**（編集は子タスクで行う）
- **子タスクがない、または全て未設定の場合**: 何も表示しない

---

**タスクノード**:
```
[✓] タスク名  ⏲ 30分  [中]
              ↑
         見積もり時間
      (手動設定・編集可能)
```

**特徴**:
- バッジクリックで編集可能
- ポップオーバーから選択肢を選択

---

**タスクノード（子を持つタスク）**:
```
[✓] タスクC  ⏲ 2.5時間  [中]
              ↑
        子孫合計の統合表示（バッジクリックで上書き可）
```

---

## 📝 選択肢

### 見積もり時間の選択肢

| 表示 | 値（分） | 用途 |
|------|---------|------|
| 5分 | 5 | 簡単なタスク |
| 15分 | 15 | 短めのタスク |
| 30分 | 30 | 標準的なタスク |
| 45分 | 45 | やや長めのタスク |
| 1時間 | 60 | 長めのタスク |
| 2時間 | 120 | 大きなタスク |

**カスタム入力**: 将来的な拡張として検討（今回は選択肢のみ）

---

## 🎨 UI コンポーネント

### 見積もり時間バッジ

**設定時の表示**:
```tsx
<span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
    ⏲ 30分
</span>
```

**カラーリング**:
- 背景: `bg-blue-500/10` （薄い青）
- テキスト: `text-blue-400` （青）
- ボーダー: `border-blue-500/20` （薄い青のボーダー）

**アイコン**: ⏲（タイマーアイコン）

---

### ポップオーバー（選択UI）

**実装**: `Popover` コンポーネント（優先度と同じ方式）

```tsx
<Popover>
    <PopoverTrigger asChild>
        {estimatedTime ? (
            <span>⏲ {formatEstimatedTime(estimatedTime)}</span>
        ) : (
            <button>⏲</button> // 未設定時はアイコンのみ
        )}
    </PopoverTrigger>
    <PopoverContent>
        <div className="grid gap-1">
            <button onClick={() => onSelect(5)}>5分</button>
            <button onClick={() => onSelect(15)}>15分</button>
            <button onClick={() => onSelect(30)}>30分</button>
            <button onClick={() => onSelect(45)}>45分</button>
            <button onClick={() => onSelect(60)}>1時間</button>
            <button onClick={() => onSelect(120)}>2時間</button>
        </div>
    </PopoverContent>
</Popover>
```

---

## 🗄️ データベース

### 既存のカラム確認

**tasks テーブル**:
```sql
estimated_time INTEGER DEFAULT 0
```

**既に存在しています！** → マイグレーション不要

**値の単位**: 分（minutes）

---

### 新規追加: task_groups テーブルに estimated_time カラムを追加

**マイグレーションSQL**:
```sql
-- Add estimated_time column to task_groups table
ALTER TABLE task_groups 
ADD COLUMN IF NOT EXISTS estimated_time INTEGER DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN task_groups.estimated_time IS 'Estimated time in minutes. NULL = auto-calculated from all descendant tasks, INTEGER = manually set value';
```

**値の意味**:
- `NULL` = 自動計算モード（全階層の子タスクの見積もり時間を再帰的に集計）
- `INTEGER` = 手動設定モード（設定された値を表示）

**値の単位**: 分（minutes）

---

### 親タスク（グループ）の見積もり時間について

**重要**: 親タスク（`task_groups` テーブル）に `estimated_time` カラムを**追加する**

**設計方針**: **自動計算 + 手動編集の両立**

1. **デフォルト**: 全階層の子タスクの見積もり時間を自動計算して表示
2. **手動編集可能**: ユーザーが手動で設定すると、自動計算を上書き
3. **手動削除**: 手動設定を削除（`null`に設定）すると、再び自動計算に戻る

**データベース**:
- `task_groups.estimated_time` カラムを追加（`INTEGER DEFAULT NULL`）
- `NULL` = 自動計算モード（全階層の合計を表示）
- `数値` = 手動設定モード（設定された値を表示）

**実装ロジック**:
```typescript
// 自動計算: 全階層の子タスクの見積もり時間を再帰的に集計
const calculateTotalEstimatedTimeRecursive = (parentId: string | null, allTasks: Task[]): number => {
    const directChildren = allTasks.filter(t => t.parent_task_id === parentId);
    return directChildren.reduce((acc, child) => {
        const childTime = child.estimated_time || 0;
        const descendantTime = calculateTotalEstimatedTimeRecursive(child.id, allTasks);
        return acc + childTime + descendantTime;
    }, 0);
};

// 表示する見積もり時間
const displayEstimatedTime = group.estimated_time !== null 
    ? group.estimated_time  // 手動設定がある場合はそれを使用
    : calculateTotalEstimatedTimeRecursive(null, childTasks); // なければ自動計算
```

---

## 🔍 集計範囲と手動編集機能

### ✅ 決定: 全階層の子タスクを集計 + 手動編集可能

**設計方針**: **自動計算 + 手動編集の両立**

1. **自動計算**: 全階層（最大6階層）の子タスクの見積もり時間を再帰的に集計
2. **手動編集可能**: ユーザーが手動で設定すると、自動計算を上書き
3. **手動削除**: 手動設定を削除（`null`に設定）すると、再び自動計算に戻る

**理由**:
- ✅ **柔軟性**: 自動集計で親タスクに表示させながらも、不要な時や追加で時間を設定したい時は柔軟に変更可能
- ✅ **プロジェクト全体の時間が分かる**: 全ての階層を含む正確な合計
- ✅ **実用的**: 手動で調整できるため、実情に合わせて修正可能

---

### 実装方法

#### 再帰的な集計関数

```typescript
// 全階層の子孫を再帰的に集計（自動集計は絶対ではない：親で上書き可）
// ルール:
// - 葉タスク: 自分の estimated_time を採用
// - 親タスク:
//   - 上書き値（estimated_time > 0）がある場合: その値を採用（子孫合計は採用しない）
//   - 上書き値がない場合: 子孫合計を採用
const calculateSubtreeEstimatedMinutes = (
  taskId: string,
  allTasks: Task[]
): number => {
  const children = allTasks.filter(t => t.parent_task_id === taskId);
  const self = allTasks.find(t => t.id === taskId);

  // Leaf
  if (children.length === 0) return self?.estimated_time || 0;

  // Parent with manual override (non-absolute auto)
  if ((self?.estimated_time || 0) > 0) return self!.estimated_time;

  // Auto mode: sum descendants
  return children.reduce(
    (acc, child) => acc + calculateSubtreeEstimatedMinutes(child.id, allTasks),
    0
  );
};

// グループ内の「rootタスク（parent_task_id === null）」の合計
const calculateGroupEstimatedMinutes = (groupTasks: Task[]): number => {
  const roots = groupTasks.filter(t => !t.parent_task_id);
  return roots.reduce((acc, root) => acc + calculateSubtreeEstimatedMinutes(root.id, groupTasks), 0);
};

// 自動計算（グループ全体）: rootタスクから全階層を集計（親は二重計上しない）
const autoCalculatedTime = calculateGroupEstimatedMinutes(
  tasks.filter(t => t.group_id === groupId)
);

// 表示する見積もり時間
const displayEstimatedTime = group.estimated_time !== null 
    ? group.estimated_time  // 手動設定がある場合はそれを使用
    : autoCalculatedTime;   // なければ自動計算
```

---

### 手動編集のUI

**親タスク（グループ）の見積もり時間バッジ**:
- **自動計算モード**（`group.estimated_time === null`）:
  - バッジをクリック → ポップオーバーが開く
  - 「自動計算: 2.5時間」と表示
  - 選択肢から手動設定可能
  - 「自動計算に戻す」ボタンあり（既に自動計算の場合は非表示）

- **手動設定モード**（`group.estimated_time !== null`）:
  - バッジをクリック → ポップオーバーが開く
  - 「手動設定: 3時間」と表示
  - 選択肢から変更可能
  - 「自動計算に戻す」ボタンあり（`null`に設定）

**削除ボタン（×）**:
- **自動計算モード**: 非表示（削除できない）
- **手動設定モード**: 表示（クリックで自動計算に戻す）

---

### 例

**初期状態（自動計算モード）**:
```
グループ: タスク入力項目整理  [⏲ 2.5時間]  ← 自動計算（全階層の合計）
  ├ タスクA: 30分
  ├ タスクB: 45分
  └ タスクC: 15分
     └ タスクC-1: 20分
        └ タスクC-2: 10分
           └ タスクC-3: 5分

合計: 30 + 45 + 15 + 20 + 10 + 5 = 125分 = 2.1時間 → 2時間（丸め）
```

**手動設定後**:
```
グループ: タスク入力項目整理  [⏲ 3時間] [×]  ← 手動設定（自動計算を上書き）
  ├ タスクA: 30分
  ├ タスクB: 45分
  └ タスクC: 15分
     └ タスクC-1: 20分
        └ タスクC-2: 10分
           └ タスクC-3: 5分

手動設定: 3時間（自動計算の2.5時間を上書き）
```

**削除後（自動計算に戻る）**:
```
グループ: タスク入力項目整理  [⏲ 2.5時間]  ← 自動計算に戻る
  ├ タスクA: 30分
  ├ タスクB: 45分
  └ タスクC: 15分
     └ タスクC-1: 20分
        └ タスクC-2: 10分
           └ タスクC-3: 5分

自動計算: 2.5時間（全階層の合計）
```

---

## 📊 表示フォーマット

### ⚠️ 重要な設計判断: 表示形式の改善

**問題点**: 6階層全てを合算すると、分で表示すると非常に見づらくなる
- 例: `⏲ 1250分` → 読みにくい
- 例: `⏲ 20時間50分` → 長すぎる

**解決策**: **1時間以上の場合は時間単位で表示**（小数点1桁まで）

---

### フォーマット関数（改訂版）

```typescript
function formatEstimatedTime(minutes: number): string {
    // 1時間未満: 分単位で表示
    if (minutes < 60) {
        return `${minutes}分`;
    }
    
    // 1時間ちょうど
    if (minutes === 60) {
        return '1時間';
    }
    
    // 1時間以上: 時間単位で表示（小数点1桁まで）
    const hours = minutes / 60;
    
    // 30分単位で切り捨て（例: 1.5時間、2.0時間、2.5時間）
    const roundedHours = Math.round(hours * 2) / 2;
    
    // 整数時間の場合は小数点なし
    if (roundedHours % 1 === 0) {
        return `${roundedHours}時間`;
    }
    
    // 小数点あり（0.5時間 = 30分）
    return `${roundedHours}時間`;
}
```

**表示例**:
- `5` → `5分`
- `30` → `30分`
- `60` → `1時間`
- `90` → `1.5時間`（`1時間30分`ではなく）
- `120` → `2時間`
- `150` → `2.5時間`（`2時間30分`ではなく）
- `1250` → `20.8時間`（`20時間50分`ではなく）
- `1800` → `30時間`（`30時間0分`ではなく）

**メリット**:
- ✅ **見やすい**: 大きな数字でも一目で分かる
- ✅ **コンパクト**: バッジの幅を節約
- ✅ **実用的**: プロジェクト全体の時間を把握しやすい

---

## 🔧 実装内容

### Phase 1: UI コンポーネント作成（5分）

**新規ファイル**: `src/components/ui/estimated-time-select.tsx`

**内容**:
```tsx
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ESTIMATED_TIME_OPTIONS = [
    { label: '5分', value: 5 },
    { label: '15分', value: 15 },
    { label: '30分', value: 30 },
    { label: '45分', value: 45 },
    { label: '1時間', value: 60 },
    { label: '2時間', value: 120 },
]

export function formatEstimatedTime(minutes: number): string {
    // 1時間未満: 分単位で表示
    if (minutes < 60) {
        return `${minutes}分`;
    }
    
    // 1時間ちょうど
    if (minutes === 60) {
        return '1時間';
    }
    
    // 1時間以上: 時間単位で表示（小数点1桁まで、30分単位で丸める）
    const hours = minutes / 60;
    const roundedHours = Math.round(hours * 2) / 2; // 0.5時間単位で丸める
    
    // 整数時間の場合は小数点なし
    if (roundedHours % 1 === 0) {
        return `${roundedHours}時間`;
    }
    
    // 小数点あり（0.5時間 = 30分）
    return `${roundedHours}時間`;
}

interface EstimatedTimeBadgeProps {
    minutes: number
}

export function EstimatedTimeBadge({ minutes }: EstimatedTimeBadgeProps) {
    return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
            ⏲ {formatEstimatedTime(minutes)}
        </span>
    )
}

interface EstimatedTimePopoverProps {
    value?: number
    onChange: (minutes: number) => void
    trigger?: React.ReactNode
    // For group tasks (parent tasks)
    onReset?: () => void // Reset to auto-calculated mode
    isManualMode?: boolean // Whether this is manually set
    autoCalculatedTime?: number // Auto-calculated time for display
}

export function EstimatedTimePopover({ 
    value, 
    onChange, 
    trigger,
    onReset,
    isManualMode = false,
    autoCalculatedTime
}: EstimatedTimePopoverProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        ⏲
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2" align="start">
                {/* Show auto-calculated time if in manual mode */}
                {isManualMode && autoCalculatedTime !== undefined && (
                    <div className="text-xs text-muted-foreground mb-2 px-2">
                        自動計算: {formatEstimatedTime(autoCalculatedTime)}
                    </div>
                )}
                <div className="grid gap-1">
                    {ESTIMATED_TIME_OPTIONS.map(option => (
                        <Button
                            key={option.value}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "justify-start text-xs h-8",
                                value === option.value && "bg-blue-500/10 text-blue-400"
                            )}
                            onClick={() => {
                                onChange(option.value)
                                setOpen(false)
                            }}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
                {/* Reset button for manual mode */}
                {isManualMode && onReset && (
                    <div className="mt-2 pt-2 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-8 text-muted-foreground"
                            onClick={() => {
                                onReset()
                                setOpen(false)
                            }}
                        >
                            自動計算に戻す
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
```

---

### Phase 2: タスクリスト（center-pane.tsx）に追加（8分）

#### 2-1. 全階層の子タスクの見積もり時間を再帰的に集計する関数を追加

**追加位置**: CenterPane コンポーネント内（トップレベル）

```tsx
// Calculate total estimated time for ALL descendant tasks recursively (全階層)
const calculateGroupEstimatedTimeRecursive = (
    parentId: string | null,
    allTasks: Task[]
): number => {
    const directChildren = allTasks.filter(t => t.parent_task_id === parentId);
    return directChildren.reduce((acc, child) => {
        const childTime = child.estimated_time || 0;
        const descendantTime = calculateGroupEstimatedTimeRecursive(child.id, allTasks);
        return acc + childTime + descendantTime;
    }, 0);
};

// Get display estimated time (manual or auto-calculated)
const getGroupDisplayEstimatedTime = (group: TaskGroup): number => {
    if (group.estimated_time !== null) {
        // Manual mode: use manually set value
        return group.estimated_time;
    }
    // Auto mode: calculate from all descendant tasks
    const groupTasks = tasks.filter(t => t.group_id === group.id);
    return calculateGroupEstimatedTimeRecursive(null, groupTasks);
};
```

---

#### 2-2. TaskItem コンポーネント（子タスク）に追加

**追加位置**: フォーカスボタンの右側、優先度の左側

**Before**:
```tsx
<Button onClick={startTimer}>▶ フォーカス</Button>

{/* Group 2: Priority */}
<div className="flex items-center gap-1">
    {task.priority ? ...}
</div>
```

**After**:
```tsx
<Button onClick={startTimer}>▶ フォーカス</Button>

{/* Group 1.5: Estimated Time (新規) */}
<div className="flex items-center gap-1">
    {task.estimated_time > 0 ? (
        <>
            <EstimatedTimePopover
                value={task.estimated_time}
                onChange={(minutes) => onUpdateTask?.(task.id, { estimated_time: minutes })}
                trigger={
                    <span className="cursor-pointer">
                        <EstimatedTimeBadge minutes={task.estimated_time} />
                    </span>
                }
            />
            <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 text-zinc-500 hover:text-red-400"
                onClick={() => onUpdateTask?.(task.id, { estimated_time: 0 })}
                title="見積もり時間を削除"
            >
                <X className="w-3 h-3" />
            </Button>
        </>
    ) : (
        <EstimatedTimePopover
            value={0}
            onChange={(minutes) => onUpdateTask?.(task.id, { estimated_time: minutes })}
            trigger={
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-500 hover:text-zinc-400 opacity-0 group-hover:opacity-100"
                    title="見積もり時間を設定"
                >
                    ⏲
                </Button>
            }
        />
    )}
</div>

{/* Group 2: Priority */}
<div className="flex items-center gap-1">
    {task.priority ? ...}
</div>
```

---

#### 2-3. Group Header（親タスク）に見積もり時間を追加（自動計算 + 手動編集可能）

**追加位置**: フォーカスボタンの右側、優先度の左側

```tsx
<Button onClick={startTimer}>▶ フォーカス</Button>

{/* Group 1.5: Estimated Time (自動計算 + 手動編集可能・新規) */}
{(() => {
    const displayEstimatedTime = getGroupDisplayEstimatedTime(group);
    const isManualMode = group.estimated_time !== null;
    const autoCalculatedTime = calculateGroupEstimatedTimeRecursive(
        null,
        tasks.filter(t => t.group_id === group.id)
    );
    
    return displayEstimatedTime > 0 ? (
        <div className="flex items-center gap-1">
            <EstimatedTimePopover
                value={displayEstimatedTime}
                onChange={(minutes) => onUpdateGroup?.(group.id, { estimated_time: minutes })}
                onReset={() => onUpdateGroup?.(group.id, { estimated_time: null })}
                isManualMode={isManualMode}
                autoCalculatedTime={autoCalculatedTime}
                trigger={
                    <span className="cursor-pointer">
                        <EstimatedTimeBadge minutes={displayEstimatedTime} />
                    </span>
                }
            />
            {isManualMode && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-zinc-500 hover:text-red-400"
                    onClick={() => onUpdateGroup?.(group.id, { estimated_time: null })}
                    title="自動計算に戻す"
                >
                    <X className="w-3 h-3" />
                </Button>
            )}
        </div>
    ) : null;
})()}

{/* Group 2: Priority */}
<div className="flex items-center gap-1">
    {group.priority != null ? ...}
</div>
```

**ポイント**:
- **自動計算モード**（`group.estimated_time === null`）: 全階層の合計を表示、削除ボタンなし
- **手動設定モード**（`group.estimated_time !== null`）: 手動設定値を表示、削除ボタンあり（自動計算に戻す）
- **バッジクリック**: ポップオーバーが開き、手動設定・自動計算への切り替えが可能
- **`displayEstimatedTime > 0` の場合のみ表示**（子タスクに見積もりがない場合は非表示）

---

### Phase 3: マインドマップ（mind-map.tsx）に追加（7分）

#### 3-1. TaskNode に追加

**追加位置**: 優先度バッジの左側

```tsx
{/* Estimated Time (if set) */}
{data?.estimated_time > 0 && (
    <EstimatedTimePopover
        value={data.estimated_time}
        onChange={(minutes) => data.onUpdateTask?.({ estimated_time: minutes })}
        trigger={
            <span className="cursor-pointer shrink-0">
                <EstimatedTimeBadge minutes={data.estimated_time} />
            </span>
        }
    />
)}

{/* Priority (if set) */}
{data?.priority != null && ...}
```

#### 3-2. GroupNode に累計見積もり時間を追加（自動計算 + 手動編集可能）

**位置**: 優先度の左側

```tsx
// Calculate total estimated time from ALL descendant tasks recursively (全階層)
const calculateTotalEstimatedTimeRecursive = (
    parentId: string | null,
    allTasks: any[]
): number => {
    const directChildren = allTasks.filter(t => t.parent_task_id === parentId);
    return directChildren.reduce((acc, child) => {
        const childTime = child.estimated_time || 0;
        const descendantTime = calculateTotalEstimatedTimeRecursive(child.id, allTasks);
        return acc + childTime + descendantTime;
    }, 0);
};

// Get display estimated time (manual or auto-calculated)
const displayEstimatedTime = useMemo(() => {
    if (data?.estimated_time !== null && data?.estimated_time !== undefined) {
        // Manual mode: use manually set value
        return data.estimated_time;
    }
    // Auto mode: calculate from all descendant tasks
    return calculateTotalEstimatedTimeRecursive(null, data?.tasks || []);
}, [data?.estimated_time, data?.tasks]);

const autoCalculatedTime = useMemo(() => {
    return calculateTotalEstimatedTimeRecursive(null, data?.tasks || []);
}, [data?.tasks]);

const isManualMode = data?.estimated_time !== null && data?.estimated_time !== undefined;

// JSX
{displayEstimatedTime > 0 && (
    <>
        <EstimatedTimePopover
            value={displayEstimatedTime}
            onChange={(minutes) => data.onUpdateGroup?.({ estimated_time: minutes })}
            onReset={() => data.onUpdateGroup?.({ estimated_time: null })}
            isManualMode={isManualMode}
            autoCalculatedTime={autoCalculatedTime}
            trigger={
                <span className="cursor-pointer shrink-0">
                    <EstimatedTimeBadge minutes={displayEstimatedTime} />
                </span>
            }
        />
        {isManualMode && (
            <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 text-zinc-500 hover:text-red-400 shrink-0"
                onClick={() => data.onUpdateGroup?.({ estimated_time: null })}
                title="自動計算に戻す"
            >
                <X className="w-3 h-3" />
            </Button>
        )}
    </>
)}

{/* Priority (if set) */}
{data?.priority != null && ...}
```

**ポイント**:
- **全階層の子タスクの `estimated_time` を再帰的に集計**
- **自動計算モード**（`data.estimated_time === null`）: 全階層の合計を表示、削除ボタンなし
- **手動設定モード**（`data.estimated_time !== null`）: 手動設定値を表示、削除ボタンあり（自動計算に戻す）
- **バッジクリック**: ポップオーバーが開き、手動設定・自動計算への切り替えが可能
- **`displayEstimatedTime > 0` の場合のみ表示**
- **スタイル**は TaskNode と同じ青系のバッジ

---

## 📊 実装後のレイアウト

### タスクリスト - 子タスク（全て設定時）

```
[✓] タスク名  ⏱ 00:15:00  [▶ フォーカス]  [⏲ 30分] [×]  [中] [×] 🎯  [1/27 09:00] [×] 📅  [+] [🗑]
```

**設定されていない場合**（すっきり）:
```
[✓] タスク名  ⏱ 00:15:00  [▶ フォーカス]  (ホバー: ⏲)  [+] [🗑]
```

---

### タスクリスト - 親タスク（グループ）

**全階層の子タスクの見積もり時間の合計を自動表示（自動計算モード）**:
```
[✓] タスク入力項目整理  ⏱ 01:30:00  [▶ フォーカス]  [⏲ 2.5時間]  [中] [×] 🎯  [1/27 09:00] [×] 📅  [+] [🗑]
                                                      ↑
                                        全階層の子タスクの見積もり時間の合計
                                         (自動計算・削除ボタンなし・クリックで手動設定可能)
```

**手動設定モード**:
```
[✓] タスク入力項目整理  ⏱ 01:30:00  [▶ フォーカス]  [⏲ 3時間] [×]  [中] [×] 🎯  [1/27 09:00] [×] 📅  [+] [🗑]
                                                      ↑      ↑
                                        手動設定値    削除ボタン
                                         (自動計算を上書き・クリックで変更可能)
```

**子タスクの見積もり時間が未設定の場合**:
```
[✓] タスク入力項目整理  ⏱ 01:30:00  [▶ フォーカス]  [中] [×] 🎯  [1/27 09:00] [×] 📅  [+] [🗑]
```

---

### マインドマップ - グループノード

**全階層の子タスクの見積もり時間の合計を自動表示（自動計算モード）**:
```
[✓] タスク入力項目整理  ⏲ 2.5時間  [中]  1/27 09:00  [v]
                        ↑
                全階層の子タスクの見積もり時間の合計
                    (自動計算・クリックで手動設定可能)
```

**手動設定モード**:
```
[✓] タスク入力項目整理  ⏲ 3時間 [×]  [中]  1/27 09:00  [v]
                        ↑    ↑
                手動設定値  削除ボタン
                    (自動計算を上書き・クリックで変更可能)
```

**注意**: 
- **全階層（最大6階層）の子タスクを再帰的に集計**
- **1時間以上は時間単位で表示**（例: `1.5時間`、`2時間`）
- **手動設定で自動計算を上書き可能**
- **手動設定を削除すると自動計算に戻る**

---

### マインドマップ - タスクノード

```
[✓] タスク名  ⏲ 30分  [中]
              ↑
       見積もり時間（編集可能）
```

---

## 🎯 使用例

### シナリオ1: タスクに見積もり時間を設定

1. タスク行にホバー
2. ⏲ アイコンが表示される
3. クリック → ポップオーバーが開く
4. 「30分」を選択
5. バッジが表示される: `[⏲ 30分]`

### シナリオ2: 見積もり時間を変更

1. バッジ `[⏲ 30分]` をクリック
2. ポップオーバーが開く
3. 「1時間」を選択
4. バッジが更新される: `[⏲ 1時間]`

### シナリオ3: 見積もり時間を削除

1. バッジの右にある `[×]` ボタンをクリック
2. バッジが消える
3. ホバー時のみ ⏲ アイコンが表示される

### シナリオ4: グループの累計見積もり時間を確認（マインドマップ）

1. マインドマップでグループノードを確認
2. **全階層（最大6階層）の子タスク**の見積もり時間の合計が表示される
3. 例: 「タスクA: 30分」「タスクB: 45分」「タスクC: 15分」「タスクC-1: 20分」「タスクC-2: 10分」
4. グループノード: `⏲ 2時間`（合計120分 = 2時間）
5. **注意**: 全階層の子タスクが含まれる（再帰的に集計）
6. **手動編集**: バッジをクリックして手動設定可能、削除ボタンで自動計算に戻る

### シナリオ5: 親タスク（グループ）の自動計算 + 手動編集（タスクリスト）

**初期状態**:
```
親タスク: タスク入力項目整理  (見積もり時間なし)
  ├ 子タスクA  (見積もり時間なし)
  ├ 子タスクB  (見積もり時間なし)
  └ 子タスクC  (見積もり時間なし)
```

**Step 1: 子タスクAに見積もり時間を設定**
```
親タスク: タスク入力項目整理  [⏲ 30分]  ← 自動表示！
  ├ 子タスクA  [⏲ 30分]  ← 設定
  ├ 子タスクB  (見積もり時間なし)
  └ 子タスクC  (見積もり時間なし)
```

**Step 2: 子タスクBとCに見積もり時間を設定（孫タスクも含む）**
```
親タスク: タスク入力項目整理  [⏲ 2時間]  ← 自動更新！ (全階層の合計)
  ├ 子タスクA  [⏲ 30分]
  ├ 子タスクB  [⏲ 45分]
  └ 子タスクC  [⏲ 15分]
     └ 子タスクC-1  [⏲ 20分]  ← 孫タスクも含まれる
        └ 子タスクC-2  [⏲ 10分]  ← 曾孫タスクも含まれる

合計: 30 + 45 + 15 + 20 + 10 = 120分 = 2時間
```

**Step 3: 親タスクの見積もり時間を手動で設定**
```
親タスク: タスク入力項目整理  [⏲ 3時間] [×]  ← 手動設定（自動計算を上書き）
  ├ 子タスクA  [⏲ 30分]
  ├ 子タスクB  [⏲ 45分]
  └ 子タスクC  [⏲ 15分]
     └ 子タスクC-1  [⏲ 20分]
        └ 子タスクC-2  [⏲ 10分]

手動設定: 3時間（自動計算の2時間を上書き）
```

**Step 4: 手動設定を削除して自動計算に戻す**
```
親タスク: タスク入力項目整理  [⏲ 2時間]  ← 自動計算に戻る
  ├ 子タスクA  [⏲ 30分]
  ├ 子タスクB  [⏲ 45分]
  └ 子タスクC  [⏲ 15分]
     └ 子タスクC-1  [⏲ 20分]
        └ 子タスクC-2  [⏲ 10分]

自動計算: 2時間（全階層の合計）
```

**注意**: 
- **全階層（最大6階層）の子タスクを再帰的に集計**
- **1時間以上は時間単位で表示**（例: `1.5時間`、`2時間`）
- **手動設定で自動計算を上書き可能**
- **手動設定を削除すると自動計算に戻る**

**メリット**:
- 子タスクの見積もり時間を設定するだけで、親タスクの所要時間が自動的に分かる
- プロジェクト全体の計画が立てやすい
- 手動計算不要で効率的
- **柔軟性**: 不要な時や追加で時間を設定したい時は手動で変更可能

---

## 🗂️ 修正対象ファイル

### 1. 新規作成

**`src/components/ui/estimated-time-select.tsx`**
- `EstimatedTimeBadge` コンポーネント
- `EstimatedTimePopover` コンポーネント（`onReset`, `isManualMode`, `autoCalculatedTime` プロップ追加）
- `formatEstimatedTime` 関数
- `ESTIMATED_TIME_OPTIONS` 定数

**`supabase/estimated_time_migration.sql`**
- `task_groups` テーブルに `estimated_time` カラムを追加するマイグレーション

### 2. 修正ファイル

**`src/components/dashboard/center-pane.tsx`**
- `calculateGroupEstimatedTimeRecursive` 関数を追加（全階層の再帰的集計）
- `getGroupDisplayEstimatedTime` 関数を追加（手動設定 or 自動計算）
- TaskItem コンポーネントに見積もり時間UI追加
- Group Header に自動計算 + 手動編集可能な見積もり時間を追加
- `onUpdateGroup` プロップを追加（見積もり時間の更新用）

**`src/components/dashboard/mind-map.tsx`**
- `calculateTotalEstimatedTimeRecursive` 関数を追加（全階層の再帰的集計）
- TaskNode に見積もり時間バッジ追加
- GroupNode に自動計算 + 手動編集可能な見積もり時間を追加
- `onUpdateGroup` プロップを追加（見積もり時間の更新用）

**`src/hooks/useMindMapSync.ts`**
- `updateGroup` 関数に `estimated_time` の更新処理を追加

---

## ⚠️ 注意事項

### 1. 実績時間との違い

**見積もり時間（estimated_time）**:
- ユーザーが事前に設定する予想時間
- アイコン: ⏲
- カラー: 青系（`text-blue-400`）

**実績時間（total_elapsed_seconds）**:
- タイマーで計測された実際の時間
- アイコン: ⏱
- カラー: グレー系（`text-muted-foreground`）

**両方表示される場合**:
```
[✓] タスク名  ⏱ 00:45:00  [▶ フォーカス]  [⏲ 30分]
              ↑ 実績        ↑              ↑ 見積もり
           45分かかった                  30分の予定だった
```

### 2. グループノードの累計時間

**表示するのは見積もり時間の合計のみ**

理由:
- 実績時間の累計は既に表示されている（⏱ 01:30:00）
- 見積もり時間の累計を追加することで、計画との比較が可能

### 3. 0分の扱い

**`estimated_time === 0`** = 未設定として扱う
- バッジは表示しない
- ホバー時のみアイコン表示

### 4. 集計範囲と手動編集について

**重要**: 親タスク（グループ）の見積もり時間は**全階層（最大6階層）の子タスクを再帰的に集計**

**設計**:
- **自動計算モード**（`group.estimated_time === null`）: 全階層の子タスクの見積もり時間を再帰的に集計して表示
- **手動設定モード**（`group.estimated_time !== null`）: 手動で設定された値を表示（自動計算を上書き）
- **手動削除**: 手動設定を削除（`null`に設定）すると、再び自動計算に戻る

**実装**:
```typescript
// 全階層の子タスクを再帰的に集計
const calculateTotalEstimatedTimeRecursive = (
    parentId: string | null,
    allTasks: Task[]
): number => {
    const directChildren = allTasks.filter(t => t.parent_task_id === parentId);
    return directChildren.reduce((acc, child) => {
        const childTime = child.estimated_time || 0;
        const descendantTime = calculateTotalEstimatedTimeRecursive(child.id, allTasks);
        return acc + childTime + descendantTime;
    }, 0);
};

// 表示する見積もり時間
const displayEstimatedTime = group.estimated_time !== null 
    ? group.estimated_time  // 手動設定がある場合はそれを使用
    : calculateTotalEstimatedTimeRecursive(null, childTasks); // なければ自動計算
```

**例**:
```
グループ: タスク入力項目整理
  ├ タスクA: 30分  ← 含まれる
  ├ タスクB: 45分  ← 含まれる
  └ タスクC: 15分  ← 含まれる
     └ タスクC-1: 20分  ← 含まれる（孫タスク）
        └ タスクC-2: 10分  ← 含まれる（曾孫タスク）

自動計算: ⏲ 2.3時間（140分）
手動設定: ⏲ 3時間 [×]  ← 手動で上書き可能
```

---

## 🚀 実装手順

### Step 1: UI コンポーネント作成（5分）
1. `estimated-time-select.tsx` を新規作成
2. `EstimatedTimeBadge`, `EstimatedTimePopover` を実装
3. `formatEstimatedTime` 関数を実装

### Step 2: データベースマイグレーション（3分）
1. `supabase/estimated_time_migration.sql` を作成
2. `task_groups` テーブルに `estimated_time` カラムを追加
3. マイグレーションを実行

### Step 3: タスクリストに追加（10分）
1. `center-pane.tsx` に `calculateGroupEstimatedTimeRecursive` 関数を追加（全階層の再帰的集計）
2. `getGroupDisplayEstimatedTime` 関数を追加（手動設定 or 自動計算）
3. TaskItem（子タスク）に見積もり時間UIを追加（フォーカスボタンの右）
4. 削除ボタンを追加
5. Group Header（親タスク）に自動計算 + 手動編集可能な見積もり時間を追加
6. `onUpdateGroup` プロップを追加（見積もり時間の更新用）

### Step 4: マインドマップに追加（10分）
1. `mind-map.tsx` の TaskNode を修正
2. 見積もり時間バッジを追加
3. GroupNode に `calculateTotalEstimatedTimeRecursive` 関数を追加（全階層の再帰的集計）
4. GroupNode に自動計算 + 手動編集可能な見積もり時間を追加
5. `onUpdateGroup` プロップを追加（見積もり時間の更新用）

### Step 5: テスト（8分）
1. タスクに見積もり時間を設定
2. バッジが表示されることを確認
3. グループノードに累計時間が表示されることを確認（全階層の合計）
4. 削除できることを確認
5. **親タスクの自動計算をテスト**:
   - 子タスクに見積もり時間を設定 → 親タスクに合計が表示される（全階層）
   - 子タスクの見積もり時間を変更 → 親タスクの合計も更新される（自動計算モードの場合）
   - 子タスクの見積もり時間を削除 → 親タスクの合計から除外される（自動計算モードの場合）
6. **親タスクの手動編集をテスト**:
   - バッジをクリック → ポップオーバーが開く
   - 手動で時間を設定 → 自動計算を上書き
   - 削除ボタンをクリック → 自動計算に戻る
   - 「自動計算に戻す」ボタンをクリック → 自動計算に戻る

**合計所要時間**: 約36分

---

## ✅ 完了基準

### 動作確認

#### タスクリスト
- [ ] ホバー時に ⏲ アイコンが表示される
- [ ] アイコンをクリックするとポップオーバーが開く
- [ ] 選択肢から見積もり時間を選択できる
- [ ] バッジが表示される（`[⏲ 30分]`）
- [ ] バッジをクリックして変更できる
- [ ] ×ボタンで削除できる

#### マインドマップ - タスクノード
- [ ] 見積もり時間が設定されている場合、バッジが表示される
- [ ] バッジをクリックして変更できる

#### マインドマップ - グループノード
- [ ] **全階層（最大6階層）の子タスク**の見積もり時間の合計が表示される
- [ ] 正しい形式で表示される（90分 → `1.5時間`、120分 → `2時間`）
- [ ] 1時間以上は時間単位で表示される（小数点1桁まで）
- [ ] **自動計算モード**: バッジクリックで手動設定可能、削除ボタンなし
- [ ] **手動設定モード**: バッジクリックで変更可能、削除ボタンあり（自動計算に戻す）

#### 親タスク（グループ）の自動計算 + 手動編集
- [ ] 子タスクに見積もり時間を設定すると、親タスクに自動的に合計が表示される（全階層）
- [ ] 子タスクの見積もり時間を変更すると、親タスクの合計も自動更新される（自動計算モードの場合）
- [ ] 子タスクの見積もり時間を削除すると、親タスクの合計から除外される（自動計算モードの場合）
- [ ] 子タスクが全て見積もり時間未設定の場合、親タスクには何も表示されない
- [ ] **自動計算モード**（`group.estimated_time === null`）: 削除ボタンなし、バッジクリックで手動設定可能
- [ ] **手動設定モード**（`group.estimated_time !== null`）: 削除ボタンあり、バッジクリックで変更可能、「自動計算に戻す」ボタンあり
- [ ] 手動設定を削除すると、自動計算に戻る

---

## 💡 将来的な拡張（オプション）

### Phase 2: カスタム入力
- テキスト入力で任意の時間を設定
- 例: 「25分」「3時間」など

### Phase 3: 見積もり vs 実績の比較
- 見積もり時間と実績時間を比較して表示
- 例: `⏲ 30分 / ⏱ 45分`（15分オーバー）
- 色で視覚的に表現（緑: 予定内、赤: オーバー）

### Phase 4: グループの累計見積もり時間をプログレスバーに
- 見積もり時間に対する進捗を表示
- 例: 「2/4タスク完了、見積もり2時間中1時間経過」

---

## 📊 期待される効果

### ユーザーにとって

1. **作業計画が立てやすい**
   - タスクごとの所要時間を事前に見積もれる
   - 1日のスケジュールを組みやすい

2. **実績との比較が可能**
   - 見積もり: 30分
   - 実績: 45分
   - → 次回の見積もり精度が向上

3. **グループ全体の所要時間が自動計算される**
   - **全階層（最大6階層）の子タスク**の見積もり時間を設定するだけで、親タスクの所要時間が自動表示
   - 例: 「このグループの全階層のタスクは合計2.5時間かかる」
   - 優先順位の判断材料になる
   - 手動計算不要で効率的
   - **1時間以上は時間単位で表示**（例: `1.5時間`、`2時間`）で見やすい

4. **リアルタイムで更新される**
   - 子タスクを追加・変更すると、親タスクの見積もり時間も自動更新（自動計算モードの場合）
   - 常に最新の合計時間が分かる
   - プロジェクトの進捗管理がしやすい

5. **柔軟な手動編集が可能**
   - 自動計算された時間を手動で上書き可能
   - 不要な時や追加で時間を設定したい時は柔軟に変更可能
   - 手動設定を削除すると、自動計算に戻る
   - 実情に合わせて調整できる

---

**最終更新**: 2026年1月25日
