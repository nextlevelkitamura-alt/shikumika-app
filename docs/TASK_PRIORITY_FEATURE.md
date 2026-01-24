# Task Priority Feature Implementation Plan
**作成日**: 2026-01-25  
**目的**: タスクに優先度（緊急・高い・中・低い）を設定できるようにする

---

## 📋 要件

### 優先度レベル（4段階）
1. **🔴 緊急** - 赤色（Red）
2. **🟠 高い** - オレンジ色（Orange）
3. **🟡 中** - 黄色（Yellow）- デフォルト
4. **🔵 低い** - 青色（Blue）

### UI要件
- **表示形式**: ドロップダウン（Select）
- **配置場所**: 日時表示の左隣
- **デザイン**: モダンでコンパクト
- **表示場所**: 
  - center-pane.tsx（タスクリスト）
  - mind-map.tsx（マインドマップ）

---

## 🗄️ データベース確認

### 既存のスキーマ
```sql
create table tasks (
  ...
  priority integer default 3, -- 1-5
  ...
);
```

✅ **既に `priority` カラムが存在**しています！

### 優先度マッピング
既存の 1-5 システムを 4段階にマッピング:
```
1 = 緊急（urgent）  - 赤
2 = 高い（high）    - オレンジ
3 = 中（medium）    - 黄色（デフォルト）
4 = 低い（low）     - 青
5 = (未使用)
```

**注意**: データベーススキーマの変更は不要です。

---

## 🎨 UI設計

### A. タスクリスト（center-pane.tsx）

#### レイアウト
```
[✓] [タスク名] [優先度] [日時] [×] [📅] [+] [🗑]
                  ↑
              ここに配置
```

#### 詳細レイアウト（日時設定済み）
```tsx
<div className="flex items-center gap-2">
  {/* Timer Info */}
  <div>⏱ 00:15:00 [▶ フォーカス]</div>
  
  {/* Priority Selector */}
  <PrioritySelect value={task.priority} onChange={...} />
  
  {/* Date Info */}
  <div>[1/26 09:45] [×] [📅]</div>
  
  {/* Other Actions */}
  <div>[+] [🗑]</div>
</div>
```

### B. マインドマップ（mind-map.tsx）

#### TaskNodeレイアウト
```tsx
<div className="task-node">
  {/* Title */}
  <textarea>{task.title}</textarea>
  
  {/* Priority & DateTime */}
  <div className="flex items-center gap-1">
    <PriorityBadge value={task.priority} onClick={openPriorityMenu} />
    <DateTimePicker ... />
  </div>
</div>
```

---

## 🎯 コンポーネント設計

### 新規コンポーネント: `PrioritySelect`

#### ファイル: `src/components/ui/priority-select.tsx`

```tsx
export type Priority = 1 | 2 | 3 | 4

export interface PriorityOption {
  value: Priority
  label: string
  color: string
  bgColor: string
  hoverColor: string
  icon: string
}

export const PRIORITY_OPTIONS: Record<Priority, PriorityOption> = {
  1: {
    value: 1,
    label: '緊急',
    color: 'text-red-500',
    bgColor: 'bg-red-500/15',
    hoverColor: 'hover:bg-red-500/25',
    icon: '🔴'
  },
  2: {
    value: 2,
    label: '高い',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/15',
    hoverColor: 'hover:bg-orange-500/25',
    icon: '🟠'
  },
  3: {
    value: 3,
    label: '中',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/15',
    hoverColor: 'hover:bg-yellow-500/25',
    icon: '🟡'
  },
  4: {
    value: 4,
    label: '低い',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/15',
    hoverColor: 'hover:bg-blue-500/25',
    icon: '🔵'
  }
}

// Compact version (badge)
export function PriorityBadge({ 
  value, 
  onClick 
}: { 
  value: Priority
  onClick?: () => void 
}) {
  const option = PRIORITY_OPTIONS[value]
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
        option.color,
        option.bgColor,
        option.hoverColor
      )}
    >
      {option.icon} {option.label}
    </button>
  )
}

// Full select dropdown
export function PrioritySelect({ 
  value, 
  onChange 
}: { 
  value: Priority
  onChange: (value: Priority) => void 
}) {
  return (
    <Select value={value.toString()} onValueChange={(v) => onChange(Number(v) as Priority)}>
      <SelectTrigger className="w-[90px] h-7 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(PRIORITY_OPTIONS).map((option) => (
          <SelectItem key={option.value} value={option.value.toString()}>
            <div className="flex items-center gap-1.5">
              <span>{option.icon}</span>
              <span className={option.color}>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

---

## 🔧 実装手順

### Phase 1: PrioritySelect コンポーネント作成
1. `src/components/ui/priority-select.tsx` を作成
2. `PriorityBadge` コンポーネント実装（コンパクト表示用）
3. `PrioritySelect` コンポーネント実装（ドロップダウン用）
4. カラーとアイコンの設定

### Phase 2: center-pane.tsx への統合
1. `PrioritySelect` をインポート
2. タスクリストのレイアウトに追加
3. 日時表示の左隣に配置
4. `onUpdateTask` で優先度を更新

#### 配置イメージ
```tsx
{/* Timer & Priority & Date Controls */}
<div className="flex items-center gap-3">
  {/* Group 1: Timer Info */}
  <div>...</div>
  
  {/* Group 2: Priority */}
  <PrioritySelect 
    value={task.priority || 3} 
    onChange={(priority) => onUpdateTask?.(task.id, { priority })} 
  />
  
  {/* Group 3: Date Info */}
  <div>...</div>
  
  {/* Group 4: Other Actions */}
  <div>...</div>
</div>
```

### Phase 3: mind-map.tsx への統合

#### マインドマップでの表示方法（提案）

**オプション A: ポップオーバー方式**（推奨）
- `PriorityBadge` をクリック → ドロップダウンメニューが表示
- 日時選択と同じUX

```tsx
<Popover>
  <PopoverTrigger asChild>
    <button>
      <PriorityBadge value={data?.priority || 3} />
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-32 p-1">
    {Object.values(PRIORITY_OPTIONS).map((option) => (
      <button
        key={option.value}
        onClick={() => onUpdatePriority(option.value)}
        className={cn("w-full text-left px-2 py-1 rounded", option.hoverColor)}
      >
        {option.icon} {option.label}
      </button>
    ))}
  </PopoverContent>
</Popover>
```

**オプション B: インライン Select**
- 常にドロップダウンを表示
- スペースを取るが、操作が簡単

#### 推奨: オプション A（ポップオーバー方式）
- 理由:
  - マインドマップはスペースが限られている
  - 日時選択と同じUXで統一感がある
  - クリックで展開するため、通常時はコンパクト

### Phase 4: TypeScript型定義の更新
1. `src/types/database.ts` で `priority` の型を確認
2. 必要であれば型を更新

### Phase 5: デフォルト値の設定
1. 新規タスク作成時、`priority: 3`（中）をデフォルト値として設定
2. 既存タスクで `priority` が `null` の場合、`3` として扱う

### Phase 6: 動作確認
1. タスクリストで優先度を選択 → DBに保存される
2. マインドマップで優先度を選択 → DBに保存される
3. 優先度の色が正しく表示される
4. ブラウザリロード後も優先度が保持される

---

## 🎨 カラーパレット

### Tailwind CSS クラス
```tsx
// 🔴 緊急（Red）
text-red-500 / bg-red-500/15 / hover:bg-red-500/25

// 🟠 高い（Orange）
text-orange-500 / bg-orange-500/15 / hover:bg-orange-500/25

// 🟡 中（Yellow）
text-yellow-500 / bg-yellow-500/15 / hover:bg-yellow-500/25

// 🔵 低い（Blue）
text-blue-500 / bg-blue-500/15 / hover:bg-blue-500/25
```

### 視覚イメージ
```
🔴 緊急  ← 赤背景（薄い）+ 赤文字
🟠 高い  ← オレンジ背景（薄い）+ オレンジ文字
🟡 中    ← 黄色背景（薄い）+ 黄色文字（デフォルト）
🔵 低い  ← 青背景（薄い）+ 青文字
```

---

## 📱 レスポンシブ対応

### タスクリスト
- デスクトップ: 優先度バッジを常に表示
- モバイル: スペースが限られている場合、優先度アイコンのみ表示

### マインドマップ
- すべてのデバイス: ポップオーバー方式でコンパクトに表示

---

## ⚠️ 注意事項

1. **既存データとの互換性**
   - 既存のタスクで `priority` が 5 の場合、3（中）として扱う
   - `priority` が `null` の場合も 3（中）として扱う

2. **デフォルト値**
   - 新規タスク作成時: `priority: 3`（中）

3. **データベーススキーマ**
   - 変更不要（既に `priority integer default 3` が存在）

4. **マインドマップのスペース管理**
   - ポップオーバー方式を採用してスペースを節約
   - バッジはコンパクトに（アイコン + テキスト）

5. **カラーアクセシビリティ**
   - 背景色は薄く（15% opacity）、文字色は濃く（500）
   - アイコン（絵文字）も併用して、色覚異常の方にも配慮

---

## ✅ 完了条件

- [ ] Phase 1: `PrioritySelect` コンポーネント作成
- [ ] Phase 2: center-pane.tsx への統合
- [ ] Phase 3: mind-map.tsx への統合（ポップオーバー方式）
- [ ] Phase 4: TypeScript型定義の更新
- [ ] Phase 5: デフォルト値の設定
- [ ] Phase 6: 動作確認
  - [ ] タスクリストで優先度変更が動作
  - [ ] マインドマップで優先度変更が動作
  - [ ] 色が正しく表示される
  - [ ] DBに保存される

---

この計画で実装を進めます。
