# Task Date Display Improvement Plan（タスク日付表示改善計画）

## 📋 現状の問題

### 現在のレイアウト
```
[タスク名]  [タイマー情報]  [日時表示]  ...他のボタン...  [📅カレンダーアイコン]
```

**問題点**:
- カレンダーアイコン（📅）と日時表示が離れている
- どのアイコンをクリックすれば日付を設定できるのか分かりにくい
- タスク行が横に長くなりすぎる

---

## 🎯 改善後のレイアウト

### パターン1: 日時未設定
```
[タスク名]  [タイマー情報]  [📅]  ...他のボタン...
```

### パターン2: 日時設定済み
```
[タスク名]  [タイマー情報]  [1/26 09:45] [📅] [×]  ...他のボタン...
```

**改善点**:
- 日時表示とカレンダーアイコンが隣接
- 日時未設定の場合はアイコンのみでスッキリ
- 削除ボタン（×）で誤設定も簡単に解除

---

## 🎨 詳細デザイン仕様

### 日時未設定の場合
```
┌─────────────────────────────────────────────────────┐
│ [タスク名]  ⏱ 00:15:00  [📅]  [▶フォーカス] [+] [🗑]  │
└─────────────────────────────────────────────────────┘
```

**要素**:
- 📅 カレンダーアイコン（グレー）
- クリック → カレンダーポップオーバーが開く

### 日時設定済みの場合
```
┌──────────────────────────────────────────────────────────┐
│ [タスク名]  ⏱ 00:15:00  [1/26 09:45] [📅] [×]  [▶] [+] [🗑] │
└──────────────────────────────────────────────────────────┘
```

**要素**:
- `1/26 09:45` 日時テキスト（テキストカラー）
- 📅 カレンダーアイコン（アクセントカラー）
- × 削除ボタン（ホバーで赤色）
- クリック可能範囲：
  - 日時テキスト → カレンダーポップオーバーが開く
  - カレンダーアイコン → カレンダーポップオーバーが開く
  - × ボタン → 日時設定を削除（確認なし）

---

## 🛠️ 実装方針

### 現在のコード構造（推測）

#### center-pane.tsx（タスクリスト）
```tsx
<div className="task-row">
    <div className="task-content">
        <span>{task.title}</span>
        <span>{task.timer}</span>
        <span>{task.scheduled_at}</span> {/* 現在：離れた場所に表示 */}
    </div>
    <div className="task-actions">
        <DateTimePicker /> {/* 現在：右端にアイコン */}
        <Button>フォーカス</Button>
        <Button>+</Button>
        <Button>🗑</Button>
    </div>
</div>
```

### 改善後のコード構造

#### center-pane.tsx（タスクリスト）
```tsx
<div className="task-row">
    <div className="task-content">
        <span>{task.title}</span>
        <span>{task.timer}</span>
        
        {/* 新規：日時表示 + カレンダーアイコン + 削除ボタンを一体化 */}
        <div className="task-date-picker">
            {task.scheduled_at ? (
                // 日時設定済み
                <>
                    <button onClick={openCalendar} className="date-display">
                        {format(task.scheduled_at, "M/d HH:mm")}
                    </button>
                    <DateTimePicker trigger={<CalendarIcon />} />
                    <button onClick={clearDate} className="clear-button">
                        <XIcon />
                    </button>
                </>
            ) : (
                // 日時未設定
                <DateTimePicker trigger={<CalendarIcon className="gray" />} />
            )}
        </div>
    </div>
    
    <div className="task-actions">
        <Button>フォーカス</Button>
        <Button>+</Button>
        <Button>🗑</Button>
    </div>
</div>
```

---

## 📝 実装手順

### Phase 1: 日時表示の移動とスタイル調整

#### Step 1-1: 日時フォーマットを変更
**現在**: `1/26 09:45`（例：`M/d HH:mm`）  
**変更**: そのまま維持（または `M/d HH:mm` 形式で統一）

#### Step 1-2: 日時表示を DateTimePicker の隣に移動
```tsx
// center-pane.tsx または mind-map.tsx の該当箇所

{task.scheduled_at && (
    <button 
        onClick={() => /* カレンダーを開く */}
        className="text-xs text-zinc-400 hover:text-zinc-200"
    >
        {format(new Date(task.scheduled_at), "M/d HH:mm")}
    </button>
)}

<DateTimePicker
    date={task.scheduled_at ? new Date(task.scheduled_at) : undefined}
    setDate={(date) => onUpdateTask(task.id, { scheduled_at: date?.toISOString() || null })}
    trigger={
        <button className={cn(
            "text-xs",
            task.scheduled_at ? "text-sky-400" : "text-zinc-500"
        )}>
            <CalendarIcon className="h-4 w-4" />
        </button>
    }
/>
```

#### Step 1-3: 削除ボタンを追加
```tsx
{task.scheduled_at && (
    <button
        onClick={() => onUpdateTask(task.id, { scheduled_at: null })}
        className="text-xs text-zinc-500 hover:text-red-400 ml-1"
        title="日時設定を削除"
    >
        <XIcon className="h-3 w-3" />
    </button>
)}
```

### Phase 2: レイアウトの調整

#### Step 2-1: Flexbox でグループ化
```tsx
<div className="flex items-center gap-1">
    {/* 日時表示 */}
    {task.scheduled_at && (
        <span className="text-xs text-zinc-400">
            {format(new Date(task.scheduled_at), "M/d HH:mm")}
        </span>
    )}
    
    {/* カレンダーアイコン */}
    <DateTimePicker ... />
    
    {/* 削除ボタン */}
    {task.scheduled_at && (
        <button ...>
            <XIcon />
        </button>
    )}
</div>
```

#### Step 2-2: スペーシングの調整
- 日時表示とカレンダーアイコンの間：`gap-1`（4px）
- カレンダーアイコンと削除ボタンの間：`gap-1`（4px）

### Phase 3: 動作確認とリファクタリング

#### Step 3-1: 動作確認
- [ ] 日時未設定時：カレンダーアイコンのみ表示
- [ ] 日時設定時：日時 + カレンダーアイコン + 削除ボタン表示
- [ ] 日時テキストをクリック → カレンダーが開く（オプション）
- [ ] カレンダーアイコンをクリック → カレンダーが開く
- [ ] 削除ボタンをクリック → 日時設定が削除される

#### Step 3-2: コンポーネント化（オプション）
複数箇所で使用する場合は、共通コンポーネントに切り出す：

```tsx
// components/ui/task-date-picker.tsx

interface TaskDatePickerProps {
    date: Date | undefined
    onDateChange: (date: Date | undefined) => void
}

export function TaskDatePicker({ date, onDateChange }: TaskDatePickerProps) {
    return (
        <div className="flex items-center gap-1">
            {date && (
                <span className="text-xs text-zinc-400">
                    {format(date, "M/d HH:mm")}
                </span>
            )}
            
            <DateTimePicker
                date={date}
                setDate={onDateChange}
                trigger={
                    <button className={cn(
                        "text-xs",
                        date ? "text-sky-400" : "text-zinc-500"
                    )}>
                        <CalendarIcon className="h-4 w-4" />
                    </button>
                }
            />
            
            {date && (
                <button
                    onClick={() => onDateChange(undefined)}
                    className="text-xs text-zinc-500 hover:text-red-400"
                    title="日時設定を削除"
                >
                    <XIcon className="h-3 w-3" />
                </button>
            )}
        </div>
    )
}
```

---

## 🎨 スタイリング詳細

### 日時テキスト
```css
.date-display {
    font-size: 0.75rem; /* text-xs */
    color: #a1a1aa; /* text-zinc-400 */
    cursor: pointer;
    transition: color 0.2s;
}

.date-display:hover {
    color: #e4e4e7; /* text-zinc-200 */
}
```

### カレンダーアイコン
```css
.calendar-icon {
    /* 日時未設定 */
    color: #71717a; /* text-zinc-500 */
}

.calendar-icon.has-date {
    /* 日時設定済み */
    color: #38bdf8; /* text-sky-400 */
}
```

### 削除ボタン
```css
.clear-button {
    color: #71717a; /* text-zinc-500 */
    transition: color 0.2s;
}

.clear-button:hover {
    color: #f87171; /* text-red-400 */
}
```

---

## 📍 変更対象ファイル

### 必須変更
1. **`src/components/dashboard/center-pane.tsx`**
   - タスクリストの日時表示部分を変更

2. **`src/components/dashboard/mind-map.tsx`**
   - TaskNode の日時表示部分を変更

### オプション変更
3. **`src/components/ui/task-date-picker.tsx`**（新規作成）
   - 共通コンポーネント化する場合

---

## ⚠️ 注意事項

### UX 上の注意点
1. **削除確認ダイアログは不要**
   - 誤クリック防止のため、ボタンサイズを小さく
   - ホバー時のみ赤色で目立たせる
   - 削除後すぐに Supabase に保存

2. **日時テキストのクリック範囲**
   - オプション：日時テキストもクリック可能にする
   - 理由：ユーザーが直感的に「ここをクリックすれば編集できる」と分かる

3. **アイコンのカラーリング**
   - 日時未設定：グレー（`text-zinc-500`）
   - 日時設定済み：アクセントカラー（`text-sky-400`）

### 技術的な注意点
1. **Supabase への保存**
   - 削除ボタンをクリックしたら即座に `scheduled_at: null` を保存
   - エラーハンドリングを忘れずに

2. **日付フォーマット**
   - `date-fns` の `format` 関数を使用
   - フォーマット：`M/d HH:mm`（例：`1/26 09:45`）

3. **レイアウト崩れ**
   - 日時表示が長くなりすぎないように注意
   - 必要に応じて `truncate` や `overflow-hidden` を使用

---

## ✅ 完了条件

### Phase 1 完了条件
- [ ] 日時表示がカレンダーアイコンの左隣に移動している
- [ ] 日時未設定時：カレンダーアイコンのみ表示
- [ ] 日時設定済み時：日時 + カレンダーアイコン + 削除ボタン表示
- [ ] 削除ボタンが正常に動作する

### Phase 2 完了条件
- [ ] レイアウトが整っている（Flexbox でグループ化）
- [ ] スペーシングが適切
- [ ] カラーリングが適切（未設定：グレー、設定済み：スカイブルー）

### Phase 3 完了条件
- [ ] すべての動作が正常（クリック、削除、保存）
- [ ] 既存の機能が壊れていない（フォーカス、追加、削除ボタン）
- [ ] コードが整理されている（必要に応じてコンポーネント化）

---

## 🎯 次のアクション

Phase 1 から順次実行します：
1. Step 1-1: 日時フォーマットを確認・変更
2. Step 1-2: 日時表示を DateTimePicker の隣に移動
3. Step 1-3: 削除ボタンを追加
4. Step 2-1: Flexbox でグループ化
5. Step 2-2: スペーシングの調整
6. Step 3-1: 動作確認

---

**作成日**: 2026-01-24
**最終更新**: 2026-01-24
