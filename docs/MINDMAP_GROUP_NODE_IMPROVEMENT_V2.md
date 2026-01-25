　# マインドマップ グループノードUI改善計画 V2（改訂版）

**作成日**: 2026年1月25日  
**目的**: マインドマップのグループノードUIをコンパクトに改善し、タスクリストとの同期も修正

---

## 🎯 ユーザー要望（改訂版）

### 要望1: UIのコンパクト化

**変更点**:
- ❌ 進捗表示（1/4）は不要 → ノードが長くなるため削除
- ✅ 日時が設定されている場合、「月/日 時:分」形式でコンパクト表示
- ✅ 折りたたみボタンを一番右端に配置

### 要望2: 同期の修正

**問題**:
- マインドマップでグループ名を変更しても、下のタスクリスト（center-pane）に反映されない

**解決**:
- グループ名の同期処理を修正

---

## 🎨 改善後のレイアウト

### パターン1: 日時未設定・優先度未設定

```
┌─────────────────────────────┐
│ [✓] タスク入力項目整理      [v] │
│  ↑                          ↑  │
│ チェック               折りたたみ │
└─────────────────────────────┘
```

**幅**: 240px（変更なし）

---

### パターン2: 優先度のみ設定

```
┌────────────────────────────────┐
│ [✓] タスク入力項目整理  [中]  [v] │
│  ↑                     ↑      ↑  │
│ チェック             優先度 折りたたみ │
└────────────────────────────────┘
```

**幅**: 260px（+20px）

---

### パターン3: 日時のみ設定

```
┌─────────────────────────────────────┐
│ [✓] タスク入力項目整理  1/27 09:00  [v] │
│  ↑                     ↑           ↑  │
│ チェック              日時      折りたたみ │
└─────────────────────────────────────┘
```

**幅**: 280px（+40px）

---

### パターン4: 優先度＋日時 両方設定

```
┌──────────────────────────────────────────┐
│ [✓] タスク入力項目整理  [中]  1/27 09:00  [v] │
│  ↑                     ↑    ↑          ↑  │
│ チェック             優先度  日時   折りたたみ │
└──────────────────────────────────────────┘
```

**幅**: 300px（+60px）

---

## 📊 要素の詳細仕様

### 1. チェックボックス（左端）

**位置**: 一番左  
**機能**: 
- 全ての子タスク完了 → 自動的にチェック
- グループを手動チェック → 全ての子タスクも完了

**サイズ**: 16px × 16px

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

### 2. グループ名（中央左寄り）

**位置**: チェックボックスの右  
**機能**: 編集可能（既存機能を維持）

**実装**: 既存の`<textarea>`をそのまま使用

---

### 3. 優先度バッジ（設定時のみ表示）

**位置**: グループ名の右  
**表示条件**: `group.priority != null`

**形式**: 
- `[緊急]` (赤)
- `[高い]` (オレンジ)
- `[中]` (黄色)
- `[低い]` (青)

**サイズ**: コンパクト（text-[10px]）

**実装**:
```tsx
{data?.priority != null && (
    <PriorityPopover
        value={data.priority as Priority}
        onChange={(priority) => data.onUpdateGroup?.({ priority })}
        trigger={
            <span className="ml-2 cursor-pointer shrink-0">
                <PriorityBadge value={data.priority as Priority} className="text-[10px] px-1.5 py-0.5" />
            </span>
        }
    />
)}
```

---

### 4. 日時表示（設定時のみ表示）

**位置**: 優先度の右  
**表示条件**: `group.scheduled_at != null`

**形式**: `1/27 09:00` （月/日 時:分）

**サイズ**: text-[10px]

**実装**:
```tsx
{data?.scheduled_at && (
    <DateTimePicker
        date={new Date(data.scheduled_at)}
        setDate={(date) => data.onUpdateGroup?.({ scheduled_at: date?.toISOString() || null })}
        trigger={
            <span className="ml-2 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer shrink-0">
                {new Date(data.scheduled_at).toLocaleDateString('ja-JP', { 
                    month: 'numeric', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}
            </span>
        }
    />
)}
```

---

### 5. 折りたたみボタン（一番右端）

**位置**: 一番右  
**機能**: 子ノードの表示/非表示を切り替え

**表示**: `v` (展開) / `>` (折りたたみ)

**実装**:
```tsx
{data?.onToggleCollapse && data?.hasChildren && (
    <button
        type="button"
        className="ml-auto nodrag nopan text-[10px] text-muted-foreground hover:text-foreground shrink-0"
        onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse?.();
        }}
    >
        {data?.collapsed ? '>' : 'v'}
    </button>
)}
```

**重要**: `ml-auto` で右端に配置

---

## 🔧 修正内容

### Phase 1: GroupNode コンポーネントの改修（10分）

#### 修正箇所: `src/components/dashboard/mind-map.tsx` (行318-486)

**Before（現在）**:
```tsx
<div className="flex items-center">
    {/* 折りたたみボタン（左） */}
    <button onClick={onToggleCollapse}>v</button>
    
    {/* グループ名 */}
    <textarea value={editValue} />
</div>
```

**After（改善後）**:
```tsx
<div className="flex items-center gap-2 w-full">
    {/* チェックボックス（新規・左端） */}
    <button onClick={handleGroupCheckToggle}>
        {isGroupCompleted && <Check />}
    </button>
    
    {/* グループ名 */}
    <textarea value={editValue} className="flex-1" />
    
    {/* 優先度（設定時のみ） */}
    {data?.priority != null && (
        <PriorityBadge value={data.priority} />
    )}
    
    {/* 日時（設定時のみ） */}
    {data?.scheduled_at && (
        <span>{formatDate(data.scheduled_at)}</span>
    )}
    
    {/* 折りたたみボタン（右端に移動） */}
    <button onClick={onToggleCollapse} className="ml-auto">
        {collapsed ? '>' : 'v'}
    </button>
</div>
```

---

### Phase 2: ノードデータの拡張（3分）

#### 修正箇所: `src/components/dashboard/mind-map.tsx` (ノード生成部分)

**追加するデータ**:
```typescript
{
    id: groupId,
    type: 'groupNode',
    data: {
        label: group.title,
        priority: group.priority, // 新規
        scheduled_at: group.scheduled_at, // 新規
        tasks: groupTasks, // 新規（子タスクの配列）
        onSave: updateGroupTitle,
        onUpdateGroup: updateGroup, // 新規
        onUpdateTask: updateTask, // 新規
        onDelete: deleteGroup,
        onToggleCollapse: toggleGroupCollapse,
        hasChildren: true,
        collapsed: collapsedGroupIds.has(group.id)
    }
}
```

---

### Phase 3: グループ名同期の修正（5分）

#### 問題の原因

**現在の flow**:
```
マインドマップでグループ名変更
  ↓
onSave(newTitle) が呼ばれる
  ↓
updateGroupTitle(groupId, newTitle)
  ↓
Supabaseに保存
  ↓
❌ ローカルのgroupsステートが更新されない
  ↓
❌ タスクリスト（center-pane）に反映されない
```

#### 修正内容

**修正箇所**: `src/hooks/useMindMapSync.ts` の `updateGroupTitle` 関数

**Before（現在）**:
```typescript
const updateGroupTitle = useCallback(async (groupId: string, title: string) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, title } : g))
    try {
        await supabase.from('task_groups').update({ title }).eq('id', groupId)
    } catch (e) {
        console.error('[Sync] updateGroupTitle failed:', e)
    }
}, [supabase])
```

**After（修正後）**:
```typescript
const updateGroupTitle = useCallback(async (groupId: string, title: string) => {
    // Optimistic Update（即座にローカル状態を更新）
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, title } : g))
    
    try {
        // Supabaseに保存
        const { error } = await supabase
            .from('task_groups')
            .update({ title })
            .eq('id', groupId)
        
        if (error) {
            console.error('[Sync] updateGroupTitle failed:', error)
            // ロールバック（エラー時は元に戻す）
            setGroups(prev => prev.map(g => 
                g.id === groupId 
                    ? { ...g, title: prev.find(pg => pg.id === groupId)?.title || title } 
                    : g
            ))
        }
    } catch (e) {
        console.error('[Sync] updateGroupTitle exception:', e)
    }
}, [supabase])
```

**重要**: `setGroups` はすでに正しく動作しているはず。問題は、マインドマップと center-pane が同じ `groups` ステートを参照していない可能性がある。

**確認ポイント**:
1. `dashboard-client.tsx` で `currentGroups` を両方のコンポーネントに渡しているか
2. `useMindMapSync` の `groups` ステートが正しく更新されているか

---

## 🎨 ノードサイズの調整

### 動的な幅

**基本幅**: 240px

**条件による追加**:
- 優先度設定あり: +20px
- 日時設定あり: +40px

**最小幅**: 240px  
**最大幅**: 300px（優先度+日時）

**実装方法**: CSS の `min-width` と `max-width` を使用
```tsx
className="w-auto min-w-[240px] max-w-[300px]"
```

---

## 🗂️ 修正対象ファイル

### 1. `src/components/dashboard/mind-map.tsx`

**修正内容**:
- GroupNode コンポーネントの改修（行318-486）
- ノードデータの拡張（グループノード生成部分）
- レイアウト調整（折りたたみボタンを右端に）

### 2. `src/hooks/useMindMapSync.ts`

**修正内容**:
- `updateGroupTitle` の確認（既に正しく動作しているはず）
- 必要に応じてエラーハンドリングを追加

### 3. `src/app/dashboard/dashboard-client.tsx`

**確認内容**:
- `currentGroups` が MindMap と CenterPane の両方に渡されているか確認
- 同じステートを参照しているか確認

---

## ✅ 自動完了ロジック

### タスクリストと同じロジック

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

1. チェックボックスUIを追加（左端）
2. 優先度バッジを追加（条件付き、コンパクト）
3. 日時表示を追加（条件付き、`月/日 時:分` 形式）
4. 折りたたみボタンを右端に移動（`ml-auto`）
5. 自動完了ロジックを実装

### Step 2: ノードデータの拡張（3分）

1. グループノード生成時に `priority`, `scheduled_at`, `tasks` を追加
2. `onUpdateGroup`, `onUpdateTask` を追加

### Step 3: 同期問題の調査と修正（5分）

1. `dashboard-client.tsx` で `currentGroups` の渡し方を確認
2. `useMindMapSync` の `updateGroupTitle` を確認
3. 必要に応じて修正

### Step 4: テスト（3分）

1. ✅ チェックボックスが表示される
2. ✅ 自動完了が動作する
3. ✅ 優先度が設定時のみ表示される
4. ✅ 日時が設定時のみ表示される（`月/日 時:分` 形式）
5. ✅ 折りたたみボタンが右端にある
6. ✅ マインドマップでグループ名変更 → タスクリストに反映される

**合計所要時間**: 約21分

---

## 📊 Before / After

### Before（現在）

**マインドマップ**:
```
┌──────────────────────────┐
│ [v] タスク入力項目整理    │
└──────────────────────────┘
```

**タスクリスト**:
```
[✓] [v] タスク入力項目整理  ⏱ 01:30:00  1/4  [中] [1/27 09:00] ...
```

**問題**:
- 情報量の差が大きい
- グループ名変更が反映されない

---

### After（改善後）

**マインドマップ（優先度+日時設定時）**:
```
┌──────────────────────────────────────────┐
│ [✓] タスク入力項目整理  [中]  1/27 09:00  [v] │
└──────────────────────────────────────────┘
```

**タスクリスト**:
```
[✓] [v] タスク入力項目整理  ⏱ 01:30:00  1/4  [中] [1/27 09:00] ...
```

**改善**:
- 最重要情報（完了・優先度・日時）を表示
- コンパクトに保ちつつ、一貫性を確保
- グループ名の同期が正常に動作

---

## ⚠️ 注意事項

### 1. コンパクトさの維持

**優先事項**:
- ✅ マインドマップの俯瞰性を最優先
- ✅ 設定されている情報のみ表示
- ✅ 文字サイズを小さく（text-[10px]）

### 2. 既存機能の保護

**保護すべき機能**:
- ✅ グループ名の編集
- ✅ IME対応
- ✅ F2キーで編集モード
- ✅ Enter/Escapeキーの動作

### 3. 日時フォーマット

**形式**: `1/27 09:00`

**実装**:
```typescript
new Date(scheduled_at).toLocaleDateString('ja-JP', { 
    month: 'numeric', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
})
```

**結果**: `1/27 09:00` （月/日 時:分）

---

## ✅ 完了基準

### 動作確認チェックリスト

#### UI表示
- [ ] チェックボックスが左端に表示される
- [ ] 優先度が設定時のみ表示される（コンパクト）
- [ ] 日時が設定時のみ表示される（`1/27 09:00` 形式）
- [ ] 折りたたみボタンが右端に表示される

#### 自動完了機能
- [ ] 全ての子タスク完了 → グループも自動完了
- [ ] 1つでも未完了 → グループも未完了
- [ ] グループ手動完了 → 全ての子タスクも完了

#### 同期
- [ ] マインドマップでグループ名変更 → タスクリストに即座に反映
- [ ] タスクリストでグループ名変更 → マインドマップに即座に反映

#### 既存機能
- [ ] グループ名の編集が正常に動作
- [ ] IMEで日本語入力できる
- [ ] F2キーで編集モードに入れる
- [ ] Enter/Escapeキーが正常に動作

---

## 🎯 まとめ

### 改善内容

1. ✅ チェックボックス追加（自動完了機能付き）
2. ✅ 優先度バッジ追加（設定時のみ、コンパクト）
3. ✅ 日時表示追加（設定時のみ、`1/27 09:00` 形式）
4. ✅ 折りたたみボタンを右端に配置
5. ✅ グループ名同期の修正

### 所要時間

**約21分**

### 効果

- マインドマップとタスクリストの一貫性向上
- コンパクトさを維持しながら、重要情報を表示
- グループ名変更が正しく同期される

---

**最終更新**: 2026年1月25日
