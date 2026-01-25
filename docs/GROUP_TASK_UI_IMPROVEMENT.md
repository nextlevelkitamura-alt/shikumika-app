# グループタスクUI改善計画書

**作成日**: 2026年1月25日  
**目的**: グループタスク（親タスク）のUIを子タスクと統一し、使いやすさを向上

---

## 🎯 現状の問題点

### 問題1: 操作方法の不統一

**グループタスク（親タスク）**:
- ❌ 3本線メニュー（ドロップダウン）を開かないと操作できない
- ❌ 優先度設定が見えない
- ❌ 日時設定が見えない
- ❌ 削除ボタンが見えない

**子タスク（小タスク）**:
- ✅ 優先度バッジが直接表示
- ✅ 日時が直接表示
- ✅ 削除ボタンが直接表示
- ✅ ワンクリックで操作可能

### 問題2: 完了状態の同期がない

- ❌ 子タスクを全て完了しても、親タスクは未完了のまま
- ❌ 手動で親タスクにチェックを入れる必要がある
- ❌ 進捗状況が分かりづらい

---

## 🎨 改善後のUI（目標）

### グループタスク行のレイアウト

```
[✓] タスク入力項目整理  ⏱ 01:30:00  [▶ フォーカス]  [1/27 09:00]  [×]  [📅]  [緊急]  [×]  [🎯]  [+子タスク追加]  [🗑]
     ↑                    ↑             ↑              ↑            ↑    ↑    ↑       ↑    ↑     ↑              ↑
  チェック              累計時間      フォーカス       日時設定      削除  設定  優先度   削除  設定   子タスク追加    グループ削除
  (自動)               (子の合計)                    (グループ用)
```

### 子タスク（現状維持）

```
  [✓] なっさん  ⏱ 00:15:00  [▶ フォーカス]  [1/27 03:30]  [×]  [📅]  [緊急]  [×]  [🎯]  [🗑]
```

---

## 📊 実装内容

### Phase 1: グループタスクUIの拡張

#### 1-1. グループ行に子タスクと同じUIコンポーネントを追加

**追加する要素**:

1. **優先度表示・設定**
   - グループ自体に優先度を設定可能
   - `[緊急] [×] [🎯]` の形式で表示
   - クリックでPriorityPopoverを開く

2. **日時表示・設定**
   - グループ自体に期限を設定可能
   - `[1/27 09:00] [×] [📅]` の形式で表示
   - クリックでDateTimePickerを開く

3. **削除ボタン**
   - `[🗑]` グループ全体を削除
   - 確認ダイアログを表示

4. **子タスク追加ボタン**
   - `[+子タスク追加]` 新規子タスクをすぐに追加
   - 現在の`+ タスクを追加...`と同じ機能

5. **累計時間表示**
   - 子タスクの累計時間を自動計算
   - `⏱ 01:30:00` の形式で表示（読み取り専用）

6. **フォーカスボタン**
   - `[▶ フォーカス]` グループ全体をフォーカス
   - 最初の未完了子タスクを自動選択

#### 1-2. 3本線メニューの削除

**変更内容**:
- ❌ 削除: `<DropdownMenu>` コンポーネント
- ✅ 追加: インラインUI要素（上記1-1）

---

### Phase 2: 自動チェック機能の実装

#### 2-1. 自動完了ロジック

**仕様**:
```typescript
// 子タスクが全て完了したら、親タスクも完了
if (全ての子タスクがcompleted) {
  グループのstatus = 'completed'
  チェックボックスを自動的にON
}
```

**発動タイミング**:
1. 子タスクのチェックボックスをON/OFFした時
2. 子タスクを削除した時
3. 子タスクを追加した時

#### 2-2. 自動未完了ロジック

**仕様**:
```typescript
// 1つでも子タスクが未完了なら、親タスクも未完了
if (1つでも子タスクがtodo) {
  グループのstatus = 'todo'
  チェックボックスを自動的にOFF
}
```

**発動タイミング**:
1. 完了済みの子タスクのチェックを外した時
2. 新しい子タスクを追加した時

#### 2-3. 手動チェックの扱い

**仕様**:
- ✅ 親タスクを手動でチェック → 全ての子タスクも完了にする
- ✅ 親タスクを手動でチェック解除 → 全ての子タスクも未完了にする

---

### Phase 3: データベース対応

#### 3-1. groupsテーブルに追加カラム

```sql
ALTER TABLE groups
ADD COLUMN priority INTEGER DEFAULT NULL,
ADD COLUMN scheduled_at TIMESTAMPTZ DEFAULT NULL;
```

**カラム説明**:
- `priority`: グループの優先度（1-4、NULL = 未設定）
- `scheduled_at`: グループの期限日時

#### 3-2. 自動完了フラグ（オプション）

```sql
ALTER TABLE groups
ADD COLUMN auto_completed BOOLEAN DEFAULT FALSE;
```

**用途**:
- 自動完了されたグループを区別
- 手動完了との違いを記録（将来の分析用）

---

## 🗂️ 修正対象ファイル

### 1. `src/components/dashboard/center-pane.tsx`

**修正内容**:

#### A. GroupHeaderコンポーネントの大幅改修

**Before（現在）**:
```tsx
<div className="flex items-center gap-2">
  <ChevronDown />
  {group.name}
  <DropdownMenu>
    {/* 3本線メニュー */}
  </DropdownMenu>
</div>
```

**After（改善後）**:
```tsx
<div className="flex items-center gap-2">
  <Checkbox 
    checked={isGroupCompleted}
    onCheckedChange={handleGroupCheckToggle}
  />
  <ChevronDown />
  {group.name}
  
  {/* 累計時間 */}
  <span>⏱ {totalTime}</span>
  
  {/* フォーカスボタン */}
  <Button onClick={focusFirstIncompleteTask}>
    ▶ フォーカス
  </Button>
  
  {/* 日時設定（子タスクと同じUI） */}
  {group.scheduled_at ? (
    <>
      <span onClick={openDatePicker}>[{formatDate}]</span>
      <Button onClick={clearDate}>[×]</Button>
    </>
  ) : (
    <Button onClick={openDatePicker}>[📅]</Button>
  )}
  
  {/* 優先度設定（子タスクと同じUI） */}
  {group.priority != null ? (
    <>
      <PriorityBadge onClick={openPriorityPopover} />
      <Button onClick={clearPriority}>[×]</Button>
    </>
  ) : (
    <Button onClick={openPriorityPopover}>[🎯]</Button>
  )}
  
  {/* 子タスク追加 */}
  <Button onClick={addChildTask}>[+ 子タスク追加]</Button>
  
  {/* グループ削除 */}
  <Button onClick={deleteGroup}>[🗑]</Button>
</div>
```

#### B. 自動完了ロジックの追加

```typescript
// 子タスクの完了状態を監視
const isGroupCompleted = useMemo(() => {
  const childTasks = tasks.filter(t => t.group_id === group.id)
  if (childTasks.length === 0) return false
  return childTasks.every(t => t.status === 'completed')
}, [tasks, group.id])

// グループのチェックボックスを自動更新
useEffect(() => {
  if (isGroupCompleted && group.status !== 'completed') {
    onUpdateGroup?.(group.id, { status: 'completed' })
  } else if (!isGroupCompleted && group.status === 'completed') {
    onUpdateGroup?.(group.id, { status: 'todo' })
  }
}, [isGroupCompleted, group.status])

// 手動チェックのハンドラ
const handleGroupCheckToggle = (checked: boolean) => {
  // 親タスクのステータス更新
  onUpdateGroup?.(group.id, { status: checked ? 'completed' : 'todo' })
  
  // 全ての子タスクも同じステータスに更新
  const childTasks = tasks.filter(t => t.group_id === group.id)
  childTasks.forEach(task => {
    onUpdateTask?.(task.id, { status: checked ? 'completed' : 'todo' })
  })
}
```

#### C. 累計時間の計算

```typescript
const totalTime = useMemo(() => {
  const childTasks = tasks.filter(t => t.group_id === group.id)
  const totalSeconds = childTasks.reduce((acc, task) => {
    return acc + (task.elapsed_time || 0)
  }, 0)
  return formatElapsedTime(totalSeconds)
}, [tasks, group.id])
```

---

### 2. `src/components/dashboard/mind-map.tsx`

**修正内容**:

#### A. GroupNodeコンポーネントの改修

**同様の変更を適用**:
- グループノードに子タスクと同じUI要素を追加
- 3本線メニューを削除
- 自動完了ロジックを追加

---

### 3. データベース操作（Supabase関数）

**新規関数**:

#### A. `updateGroupWithAutoComplete`

```typescript
async function updateGroupWithAutoComplete(groupId: string) {
  // 子タスクを全て取得
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('group_id', groupId)
  
  // 全て完了しているか確認
  const allCompleted = tasks.every(t => t.status === 'completed')
  
  // グループのステータスを更新
  await supabase
    .from('groups')
    .update({ status: allCompleted ? 'completed' : 'todo' })
    .eq('id', groupId)
}
```

#### B. タスク更新時に自動実行

```typescript
// タスクのステータスが変更されたら、親グループを自動更新
const { data: task } = await supabase
  .from('tasks')
  .update({ status: 'completed' })
  .eq('id', taskId)
  .select()
  .single()

if (task.group_id) {
  await updateGroupWithAutoComplete(task.group_id)
}
```

---

## 🎨 UIの詳細仕様

### グループタスク行のスタイル

```tsx
<div className="flex items-center gap-2 p-2 border-b bg-gray-50">
  {/* チェックボックス */}
  <Checkbox className="w-5 h-5" />
  
  {/* 折りたたみアイコン */}
  <ChevronDown className="w-4 h-4 cursor-pointer" />
  
  {/* グループ名 */}
  <span className="font-semibold text-sm">{group.name}</span>
  
  {/* 累計時間（読み取り専用） */}
  <span className="text-xs text-muted-foreground">
    ⏱ {totalTime}
  </span>
  
  {/* フォーカスボタン */}
  <Button variant="ghost" size="sm">
    ▶ フォーカス
  </Button>
  
  {/* スペーサー */}
  <div className="flex-1" />
  
  {/* 右寄せの操作ボタン群 */}
  <div className="flex items-center gap-1">
    {/* 日時設定 */}
    {/* 優先度設定 */}
    {/* 子タスク追加 */}
    {/* グループ削除 */}
  </div>
</div>
```

---

## 🧪 テストケース

### テスト1: 自動完了

1. グループに子タスク3つを追加
2. 1つ目の子タスクを完了 → 親タスクは未完了のまま
3. 2つ目の子タスクを完了 → 親タスクは未完了のまま
4. 3つ目の子タスクを完了 → **親タスクが自動的に完了**

### テスト2: 自動未完了

1. 全ての子タスクが完了している状態（親タスクも完了）
2. 1つの子タスクのチェックを外す → **親タスクが自動的に未完了に戻る**

### テスト3: 手動完了

1. グループに未完了の子タスクがある状態
2. 親タスクを手動でチェック → **全ての子タスクも完了になる**

### テスト4: 手動未完了

1. 全ての子タスクが完了している状態
2. 親タスクを手動でチェック解除 → **全ての子タスクも未完了になる**

### テスト5: UIの統一性

1. 親タスクの優先度を設定 → 子タスクと同じUIで表示
2. 親タスクの日時を設定 → 子タスクと同じUIで表示
3. 親タスクを削除 → 確認ダイアログ表示後、削除成功

---

## 📅 実装順序

### Step 1: データベース準備（5分）
- `groups`テーブルに`priority`, `scheduled_at`カラムを追加

### Step 2: center-pane.tsx の修正（30分）
- GroupHeaderコンポーネントの改修
- 3本線メニューの削除
- インラインUI要素の追加
- 累計時間の計算

### Step 3: 自動完了ロジック（20分）
- `useMemo`で完了状態を監視
- `useEffect`で自動更新
- 手動チェックのハンドラ

### Step 4: mind-map.tsx の修正（30分）
- GroupNodeコンポーネントの改修
- center-paneと同じロジックを適用

### Step 5: テスト（15分）
- 上記5つのテストケースを実行
- バグ修正

---

## ⚠️ 注意事項

### 1. パフォーマンス

**問題**: 子タスクが多い場合、累計時間の計算が重くなる

**対策**:
- `useMemo`でメモ化
- 必要な時だけ再計算

### 2. 競合状態

**問題**: 複数の子タスクを同時に完了した時、親タスクの更新が競合する

**対策**:
- Supabaseのトランザクションを使用
- Optimistic UIで即座に反映

### 3. 子タスクが0個の場合

**問題**: 子タスクがない親タスクの扱い

**仕様**:
- 子タスクが0個 = 未完了として扱う
- 手動でチェックを入れることは可能

---

## 📚 参考資料

- [既存のタスクUI実装](../src/components/dashboard/center-pane.tsx)
- [優先度機能](./PRIORITY_OPTIONAL_FEATURE.md)
- [日時設定機能](./TASK_DATE_DISPLAY_PLAN.md)

---

## ✅ 完了基準

1. ✅ グループタスク行に、子タスクと同じUI要素が全て表示されている
2. ✅ 3本線メニューが削除されている
3. ✅ 子タスクを全て完了すると、親タスクが自動的に完了する
4. ✅ 1つでも子タスクが未完了なら、親タスクも未完了になる
5. ✅ 親タスクを手動でチェック/解除すると、全ての子タスクも連動する
6. ✅ マインドマップとタスクリスト、両方で同じ動作をする
7. ✅ 累計時間が正しく表示される

---

**最終更新**: 2026年1月25日
