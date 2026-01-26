# カレンダーUI改善計画

## 現状の問題点

### 1. 表示領域の圧迫
- ヘッダー要素が多すぎる（見出し、連携状態、カレンダー選択）
- カレンダーグリッドが狭い（全体の40%程度）
- AIフィードバックパネルがデフォルト開いている

### 2. 視認性の低さ
- 日付が小さい（text-lg）
- 曜日と日付の区別がつきにくい
- 今日の日付が目立たない
- グリッド線が濃すぎて情報密度が高い

### 3. 操作性
- カレンダー選択が常時表示（スペースの無駄）
- 設定ボタンの位置が不明確
- ドラッグ&ドロップのフィードバックが弱い

---

## 改善設計

### Before & After

#### Before（現状）
```
┌─────────────────────────────────────┐
│ [Icon] Googleカレンダー              │ ← h-14 (56px)
├─────────────────────────────────────┤
│ ✓ 連携済み                [再試行]   │ ← h-10 (40px)
├─────────────────────────────────────┤
│ [✓] 仕事                            │
│ [✓] プライベート                     │ ← h-20 (80px)
│ [✓] 家族                            │
├─────────────────────────────────────┤
│                                     │
│   [小さいカレンダーグリッド]          │ ← 残り (約200px)
│                                     │
└─────────────────────────────────────┘
合計ヘッダー高さ: 186px
カレンダー表示: 200px（全体の約50%）
```

#### After（改善後）
```
┌─────────────────────────────────────┐
│ [Icon] カレンダー  ✓ [▼]  [設定]     │ ← h-10 (40px) コンパクト化
├─────────────────────────────────────┤
│                                     │
│                                     │
│   [大きいカレンダーグリッド]          │ ← 残り (約340px)
│                                     │
│                                     │
└─────────────────────────────────────┘
合計ヘッダー高さ: 40px
カレンダー表示: 340px（全体の約85%）

カレンダー選択は▼クリックでドロップダウン表示
```

---

## デザイン仕様

### 1. ヘッダー（高さ: h-10 / 40px）

```tsx
<div className="h-10 px-3 flex items-center justify-between border-b bg-gradient-to-r from-muted/20 to-muted/10 backdrop-blur-sm">
  {/* 左側: アイコン + タイトル + 連携バッジ */}
  <div className="flex items-center gap-2">
    <CalendarIcon className="w-4 h-4 text-primary" />
    <span className="font-semibold text-sm">カレンダー</span>
    {isConnected && (
      <Badge variant="outline" className="h-5 text-[10px] gap-1">
        <Check className="w-3 h-3 text-green-500" />
        連携済み
      </Badge>
    )}
  </div>

  {/* 右側: カレンダー選択 + 設定 */}
  <div className="flex items-center gap-1">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          {selectedCount}個 <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* カレンダーリスト */}
      </DropdownMenuContent>
    </DropdownMenu>

    <Button variant="ghost" size="icon" className="h-7 w-7">
      <Settings className="w-3.5 h-3.5" />
    </Button>
  </div>
</div>
```

**効果**:
- 高さを56px → 40px に削減（16px節約）
- 連携状態を小さいバッジで表示
- カレンダー選択をドロップダウンに格納
- 設定ボタンを右上に配置

---

### 2. カレンダーグリッド（拡大 + 視認性向上）

#### 日付ヘッダー
```tsx
<div className="col-span-5 grid grid-cols-5 border-b bg-gradient-to-b from-muted/10 to-transparent">
  {weekDates.map((date, i) => {
    const isToday = isDateToday(date)
    return (
      <div
        key={i}
        className={cn(
          "py-3 text-center transition-colors",
          isToday && "bg-primary/10"
        )}
      >
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {dayNames[date.getDay()]}
        </div>
        <div className={cn(
          "text-2xl font-bold mt-1",
          isToday ? "text-primary" : "text-foreground"
        )}>
          {date.getDate()}
        </div>
      </div>
    )
  })}
</div>
```

**改善点**:
- 日付を text-lg → text-2xl に拡大
- 曜日を小さく上部に配置（10px、uppercase）
- 今日の日付に背景色（bg-primary/10）
- グラデーション背景で奥行き感

#### タイムグリッド
```tsx
{/* グリッド線を淡く */}
<div className="col-span-5 relative grid grid-rows-10 divide-y divide-border/30">
  {hours.map((hour, i) => (
    <div key={hour} className="relative h-full">
      {/* 時刻ラベル */}
      <span className="absolute -left-10 -top-2 text-[10px] text-muted-foreground/70 font-medium">
        {formatHour(hour)}
      </span>

      {/* ドロップゾーン */}
      <div className="absolute inset-0 grid grid-cols-5 gap-px">
        {weekDates.map((_, dayIndex) => {
          const cellId = `${dayIndex}-${i}`
          const isHighlighted = dragOverCell === cellId

          return (
            <div
              key={cellId}
              className={cn(
                "transition-all duration-200",
                "hover:bg-primary/5",
                isHighlighted && "bg-primary/15 shadow-inner"
              )}
              onDragOver={(e) => handleDragOver(e, cellId)}
              onDrop={(e) => handleDrop(e, dayIndex, hour)}
            />
          )
        })}
      </div>
    </div>
  ))}
</div>
```

**改善点**:
- グリッド線を `divide-border/30` で薄く
- ホバー時に `bg-primary/5` で淡く反応
- ドラッグオーバー時に `shadow-inner` で奥行き
- gap-px で微細な隙間を追加（視認性向上）

---

### 3. AIフィードバックパネル（デフォルト閉じる）

```tsx
<div className={cn(
  "flex flex-col bg-sidebar transition-all duration-300 border-t",
  isAiPanelOpen ? "h-[30%]" : "h-10" // 40% → 30% に削減
)}>
  {/* ヘッダー */}
  <div
    className="h-10 flex items-center justify-between px-3 cursor-pointer hover:bg-muted/50 transition-colors"
    onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
  >
    <div className="flex items-center gap-2 text-xs font-semibold">
      <Sparkles className="w-3.5 h-3.5" />
      AI Advisor
    </div>
    {isAiPanelOpen ? (
      <ChevronDown className="w-4 h-4" />
    ) : (
      <ChevronUp className="w-4 h-4" />
    )}
  </div>
  {/* コンテンツ */}
</div>
```

**変更点**:
- デフォルトを `false` に変更（閉じた状態）
- 開いた時の高さを 40% → 30% に削減
- ヘッダーテキストを簡潔に（"AI Advisor"）

---

## カラーパレット（モダン）

### Primary Colors
- **Primary**: `hsl(var(--primary))` - アクセントカラー
- **Primary Foreground**: 白テキスト
- **Primary Muted**: `primary/10`, `primary/20` - 淡い背景

### Neutral Colors
- **Background**: ダークモード対応
- **Muted**: `muted/5`, `muted/10` - 微細な背景
- **Border**: `border/30` - 薄いグリッド線

### State Colors
- **Hover**: `primary/5` - 微細な反応
- **Drag Over**: `primary/15` - 明確なフィードバック
- **Today**: `bg-primary/10` + `text-primary` - 強調

---

## アニメーション

```css
/* Smooth transitions */
transition-all duration-200  /* ホバー */
transition-all duration-300  /* パネル開閉 */

/* Glassmorphism */
backdrop-blur-sm
bg-gradient-to-r from-muted/20 to-muted/10

/* Shadow layers */
shadow-sm    /* 微細な影 */
shadow-inner /* ドロップ時の奥行き */
```

---

## レスポンシブ対応

### 縦横比の最適化
- カレンダーグリッドは `aspect-[5/10]` で固定比率
- 横幅に応じて高さを自動調整
- スクロール可能（overflow-auto）

### モバイル対応
- ヘッダーの padding を減らす（px-3 → px-2）
- 日付を text-2xl → text-xl に縮小
- 時刻ラベルを -left-10 → -left-8 に調整

---

## 実装優先順位

### Phase 1: ヘッダーのコンパクト化 ✅
1. 高さを h-14 → h-10 に削減
2. 連携状態をバッジ化
3. カレンダー選択をドロップダウン化
4. 設定ボタンを統合

### Phase 2: グリッドの拡大と視認性向上 ✅
1. 日付を text-2xl に拡大
2. 今日の日付を強調
3. グリッド線を薄く
4. ホバー/ドラッグフィードバック改善

### Phase 3: AIパネルのデフォルト変更 ✅
1. デフォルトを閉じた状態に
2. 開いた時の高さを削減（40% → 30%）

### Phase 4: 細部の調整
1. グラデーション背景
2. Shadow effects
3. アニメーション最適化
4. モバイル対応

---

## 期待される効果

### 定量的改善
- ヘッダー高さ: 186px → 40px（-78%）
- カレンダー表示: 200px → 340px（+70%）
- 表示面積: 50% → 85%（+35%）

### 定性的改善
- 日付の視認性向上（text-2xl）
- 今日の日付が一目でわかる
- ドラッグ&ドロップのフィードバック改善
- モダンでクリーンなデザイン
- 操作性の向上（設定がわかりやすい）

---

## 実装スケジュール

- **Phase 1**: 30分（ヘッダーコンパクト化）
- **Phase 2**: 45分（グリッド改善）
- **Phase 3**: 15分（AIパネル調整）
- **Phase 4**: 30分（細部調整）

**合計**: 約2時間

---

## 技術スタック

- **React 18**: Client Component
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Badge, DropdownMenu components
- **Lucide React**: Icons
- **Framer Motion**: (オプション) 高度なアニメーション
