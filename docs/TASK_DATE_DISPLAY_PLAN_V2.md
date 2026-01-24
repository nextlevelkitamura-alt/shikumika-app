# Task Date Display Improvement Plan V2（タスク日付表示改善計画 改訂版）

## 📋 改善内容（確定版）

### 変更点
1. ✅ タイマー記録時間とフォーカスタイマーを隣同士に配置
2. ✅ フォーカスタイマーをカレンダー時間の左隣に配置
3. ✅ カレンダーのバツマーク（×）を時間詳細の右隣に配置
4. ✅ カレンダーウィンドウは時間詳細、カレンダータブどちらをクリックしても開く

---

## 🎨 改善後のレイアウト

### パターン1: 日時未設定
```
┌──────────────────────────────────────────────────────────┐
│ [タスク名]  ⏱ 00:15:00  [▶ フォーカス]  [📅]  [+] [🗑]  │
└──────────────────────────────────────────────────────────┘
```

**要素の並び**:
1. タスク名
2. ⏱ タイマー記録時間
3. ▶ フォーカスボタン（タイマー記録時間の右隣）
4. 📅 カレンダーアイコン（フォーカスの右隣、グレー）
5. + 追加ボタン
6. 🗑 削除ボタン

### パターン2: 日時設定済み
```
┌────────────────────────────────────────────────────────────────┐
│ [タスク名]  ⏱ 00:15:00  [▶ フォーカス]  [1/26 09:45] [📅] [×]  [+] [🗑] │
└────────────────────────────────────────────────────────────────┘
```

**要素の並び**:
1. タスク名
2. ⏱ タイマー記録時間
3. ▶ フォーカスボタン（タイマー記録時間の右隣）
4. **`1/26 09:45` 日時テキスト**（フォーカスの右隣、クリック可能）
5. 📅 カレンダーアイコン（日時テキストの右隣、スカイブルー、クリック可能）
6. **× 削除ボタン**（カレンダーアイコンの右隣、日時詳細の右端）
7. + 追加ボタン
8. 🗑 削除ボタン

---

## 🖱️ クリック動作

### 日時未設定の場合
- 📅 カレンダーアイコンをクリック → カレンダーポップオーバーが開く

### 日時設定済みの場合
- **`1/26 09:45` 日時テキスト**をクリック → カレンダーポップオーバーが開く
- **📅 カレンダーアイコン**をクリック → カレンダーポップオーバーが開く
- **× 削除ボタン**をクリック → 日時設定を削除（確認なし）

---

## 🎨 詳細スタイリング

### 要素のグループ化

```tsx
<div className="task-row flex items-center gap-3">
    {/* グループ1: タスク名 */}
    <div className="task-title">
        {task.title}
    </div>
    
    {/* グループ2: タイマー情報 */}
    <div className="flex items-center gap-2">
        {/* タイマー記録時間 */}
        <span className="text-xs text-zinc-500">
            ⏱ {formatTime(task.actual_time_minutes)}
        </span>
        
        {/* フォーカスボタン */}
        <Button variant="ghost" size="sm">
            ▶ フォーカス
        </Button>
    </div>
    
    {/* グループ3: 日時情報 */}
    <div className="flex items-center gap-1">
        {task.scheduled_at ? (
            <>
                {/* 日時テキスト（クリック可能） */}
                <button 
                    onClick={openCalendar}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                    {format(new Date(task.scheduled_at), "M/d HH:mm")}
                </button>
                
                {/* カレンダーアイコン（クリック可能） */}
                <DateTimePicker
                    date={new Date(task.scheduled_at)}
                    setDate={handleDateChange}
                    trigger={
                        <button className="text-sky-400 hover:text-sky-300">
                            <CalendarIcon className="h-4 w-4" />
                        </button>
                    }
                />
                
                {/* 削除ボタン */}
                <button
                    onClick={handleClearDate}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                    title="日時設定を削除"
                >
                    <XIcon className="h-3 w-3" />
                </button>
            </>
        ) : (
            // 日時未設定：カレンダーアイコンのみ
            <DateTimePicker
                date={undefined}
                setDate={handleDateChange}
                trigger={
                    <button className="text-zinc-500 hover:text-zinc-400">
                        <CalendarIcon className="h-4 w-4" />
                    </button>
                }
            />
        )}
    </div>
    
    {/* グループ4: その他のアクション */}
    <div className="flex items-center gap-2">
        <Button>+</Button>
        <Button>🗑</Button>
    </div>
</div>
```

---

## 🛠️ 実装手順

### Phase 1: レイアウト構造の変更

#### Step 1-1: タイマー情報のグループ化
**現在**:
```tsx
<span>⏱ {timer}</span>
<Button>▶ フォーカス</Button>
```

**変更後**:
```tsx
<div className="flex items-center gap-2">
    <span className="text-xs text-zinc-500">
        ⏱ {formatTime(task.actual_time_minutes)}
    </span>
    <Button variant="ghost" size="sm">
        ▶ フォーカス
    </Button>
</div>
```

#### Step 1-2: 日時情報のグループ化
```tsx
<div className="flex items-center gap-1">
    {/* 日時テキスト、カレンダーアイコン、削除ボタン */}
</div>
```

#### Step 1-3: 要素の配置順序を調整
1. タスク名
2. タイマー情報グループ（記録時間 + フォーカスボタン）
3. 日時情報グループ（日時 + カレンダー + 削除）
4. その他のアクション（+ / 🗑）

---

### Phase 2: 日時表示部分の実装

#### Step 2-1: 日時テキストをクリック可能に
```tsx
{task.scheduled_at && (
    <button 
        onClick={() => setIsCalendarOpen(true)}
        className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
    >
        {format(new Date(task.scheduled_at), "M/d HH:mm")}
    </button>
)}
```

**ポイント**:
- `button` タグを使用（セマンティック）
- ホバーで色が変わる（`hover:text-zinc-200`）
- カーソルがポインターに変わる

#### Step 2-2: カレンダーアイコンの実装
```tsx
<DateTimePicker
    date={task.scheduled_at ? new Date(task.scheduled_at) : undefined}
    setDate={(date) => onUpdateTask(task.id, { scheduled_at: date?.toISOString() || null })}
    trigger={
        <button className={cn(
            "transition-colors",
            task.scheduled_at 
                ? "text-sky-400 hover:text-sky-300" 
                : "text-zinc-500 hover:text-zinc-400"
        )}>
            <CalendarIcon className="h-4 w-4" />
        </button>
    }
/>
```

**カラーリング**:
- 日時未設定：`text-zinc-500`（グレー）
- 日時設定済み：`text-sky-400`（スカイブルー）

#### Step 2-3: 削除ボタンの実装
```tsx
{task.scheduled_at && (
    <button
        onClick={(e) => {
            e.stopPropagation() // イベントバブリングを防ぐ
            onUpdateTask(task.id, { scheduled_at: null })
        }}
        className="text-zinc-500 hover:text-red-400 transition-colors"
        title="日時設定を削除"
    >
        <XIcon className="h-3 w-3" />
    </button>
)}
```

**ポイント**:
- `e.stopPropagation()` でイベントバブリングを防ぐ
- ホバーで赤色に変わる（`hover:text-red-400`）
- サイズを小さく（`h-3 w-3`）して誤クリックを防ぐ

---

### Phase 3: DateTimePicker の開閉制御

#### Step 3-1: 状態管理
```tsx
// DateTimePicker コンポーネント内
const [isOpen, setIsOpen] = React.useState(false)
```

#### Step 3-2: 日時テキストクリックでポップオーバーを開く
```tsx
// 親コンポーネント（center-pane.tsx または mind-map.tsx）

// DateTimePicker への ref を作成
const calendarRef = React.useRef<{ open: () => void }>(null)

// 日時テキストのクリックハンドラ
const handleDateTextClick = () => {
    calendarRef.current?.open()
}

// DateTimePicker に ref を渡す
<DateTimePicker
    ref={calendarRef}
    ...
/>
```

**または、より簡単な方法**:

DateTimePicker を制御されたコンポーネントにする：
```tsx
const [isCalendarOpen, setIsCalendarOpen] = useState(false)

// 日時テキスト
<button onClick={() => setIsCalendarOpen(true)}>
    {formatDate(task.scheduled_at)}
</button>

// DateTimePicker
<DateTimePicker
    open={isCalendarOpen}
    onOpenChange={setIsCalendarOpen}
    ...
/>
```

---

## 📍 変更対象ファイル

### 必須変更

1. **`src/components/dashboard/center-pane.tsx`**
   - タスクリストのレイアウトを変更
   - タイマー情報のグループ化
   - 日時情報のグループ化

2. **`src/components/dashboard/mind-map.tsx`**
   - TaskNode のレイアウトを変更
   - タイマー情報のグループ化
   - 日時情報のグループ化

3. **`src/components/ui/date-time-picker.tsx`**（オプション）
   - `open` / `onOpenChange` props を追加（外部から制御する場合）

---

## 🎨 詳細スペーシング

### グループ間の距離
```tsx
<div className="flex items-center gap-3">
    {/* gap-3 = 12px */}
    
    <div>{/* タスク名 */}</div>
    <div>{/* タイマー情報 */}</div>
    <div>{/* 日時情報 */}</div>
    <div>{/* その他のアクション */}</div>
</div>
```

### グループ内の距離

#### タイマー情報グループ
```tsx
<div className="flex items-center gap-2">
    {/* gap-2 = 8px */}
    <span>{/* タイマー記録時間 */}</span>
    <Button>{/* フォーカス */}</Button>
</div>
```

#### 日時情報グループ
```tsx
<div className="flex items-center gap-1">
    {/* gap-1 = 4px */}
    <button>{/* 日時テキスト */}</button>
    <DateTimePicker>{/* カレンダーアイコン */}</DateTimePicker>
    <button>{/* 削除ボタン */}</button>
</div>
```

---

## ✅ 完了条件

### Phase 1 完了条件
- [ ] タイマー記録時間とフォーカスボタンが隣同士に配置されている
- [ ] フォーカスボタンがカレンダー時間の左隣に配置されている
- [ ] 全体のレイアウトが計画通りに並んでいる

### Phase 2 完了条件
- [ ] 日時未設定時：カレンダーアイコンのみ表示（グレー）
- [ ] 日時設定済み時：日時テキスト + カレンダーアイコン（スカイブルー）+ 削除ボタン
- [ ] 削除ボタンが日時テキストの右端に配置されている
- [ ] 削除ボタンが正常に動作する

### Phase 3 完了条件
- [ ] 日時テキストをクリック → カレンダーポップオーバーが開く
- [ ] カレンダーアイコンをクリック → カレンダーポップオーバーが開く
- [ ] 削除ボタンをクリック → 日時設定が削除される
- [ ] すべての動作が正常

---

## 🎯 次のアクション

Phase 1 から順次実行します：

### Phase 1: レイアウト構造の変更
1. Step 1-1: タイマー情報のグループ化
2. Step 1-2: 日時情報のグループ化
3. Step 1-3: 要素の配置順序を調整

### Phase 2: 日時表示部分の実装
1. Step 2-1: 日時テキストをクリック可能に
2. Step 2-2: カレンダーアイコンの実装
3. Step 2-3: 削除ボタンの実装

### Phase 3: DateTimePicker の開閉制御
1. Step 3-1: 状態管理
2. Step 3-2: 日時テキストクリックでポップオーバーを開く

---

**作成日**: 2026-01-24
**最終更新**: 2026-01-24 (V2: レイアウト順序確定版)
