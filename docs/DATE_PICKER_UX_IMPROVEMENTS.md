# Date Picker UX Improvements Plan
**作成日**: 2026-01-25  
**目的**: カレンダー・時間選択UIの使いやすさを向上

---

## 📋 修正内容（3項目）

### 1️⃣ 日付選択時にカレンダーを閉じない
**現状の問題**:
- 日付をクリックすると自動的にカレンダーが閉じる
- 日付と時間の両方を設定したい場合、再度カレンダーを開く必要がある

**修正内容**:
- 日付選択後もカレンダーを開いたままにする
- ユーザーが時間も設定できるようにする
- カレンダーを閉じるには、ポップオーバー外をクリックする（既存の動作）

**変更ファイル**:
- `src/components/ui/date-time-picker.tsx`

**実装方針**:
- `handleDateSelect` 関数内で `setIsOpen(false)` が呼ばれていないことを確認
- もし呼ばれていれば削除
- Popover の `onOpenChange` の動作を確認

---

### 2️⃣ 日時テキストとカレンダーアイコンの両方からカレンダーを開く
**現状の問題**:
- 日時テキスト（例: `1/26 09:45`）をクリックしても何も反応しない
- カレンダーアイコンのみがトリガーになっている

**修正内容**:
- 日時テキストをクリックしてもカレンダーが開くようにする
- 日時テキストとカレンダーアイコンを同じ `PopoverTrigger` でラップする

**変更ファイル**:
- `src/components/dashboard/center-pane.tsx`
- `src/components/dashboard/mind-map.tsx`

**実装方針**:
```tsx
// Before:
<span>{date}</span>
<Button>×</Button>
<DateTimePicker trigger={<Button><CalendarIcon /></Button>} />

// After:
<DateTimePicker trigger={
  <div className="flex items-center gap-1">
    <span>{date}</span>
    <Button>×</Button>
    <Button><CalendarIcon /></Button>
  </div>
} />
```

**注意点**:
- × ボタンは `onClick` で `e.stopPropagation()` を呼び、カレンダーが開かないようにする
- 日時テキストとカレンダーアイコンは `cursor-pointer` を追加

---

### 3️⃣ 時間ホイールで選択した時間を中央のブルー背景に自動スクロール
**現状の問題**:
- 時間を選択しても、ホイールのスクロール位置は変わらない
- 選択した時間が画面外にある場合、視覚的にわかりにくい
- ユーザーが「何時を設定したか」を確認しにくい

**修正内容**:
- 時間をクリックすると、その時間が中央のブルー背景（ハイライトバンド）に移動する
- カレンダーを開いた時も、現在設定されている時間が中央に表示される

**変更ファイル**:
- `src/components/ui/date-time-picker.tsx` (TimeWheel コンポーネント)

**実装方針**:
1. **各時間ボタンに `ref` を付与**
   ```tsx
   const hourRefs = useRef<(HTMLButtonElement | null)[]>([])
   const minuteRefs = useRef<(HTMLButtonElement | null)[]>([])
   ```

2. **選択した時間を中央にスクロール**
   ```tsx
   const scrollToCenter = (element: HTMLElement) => {
     element.scrollIntoView({
       behavior: 'smooth',
       block: 'center',
       inline: 'center'
     })
   }
   ```

3. **時間変更時にスクロール**
   ```tsx
   const handleTimeChange = (type: "hour" | "minute", value: number) => {
     // ... existing logic ...
     
     // Scroll to selected time
     if (type === "hour") {
       hourRefs.current[value]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
     } else {
       const minuteIndex = value / 5
       minuteRefs.current[minuteIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
     }
   }
   ```

4. **カレンダー開いた時に初期位置を設定**
   ```tsx
   useEffect(() => {
     if (selectedDate) {
       const hour = selectedDate.getHours()
       const minute = selectedDate.getMinutes()
       
       // 初期スクロール位置を設定（behavior: 'auto' で即座に移動）
       hourRefs.current[hour]?.scrollIntoView({ behavior: 'auto', block: 'center' })
       const minuteIndex = Math.floor(minute / 5)
       minuteRefs.current[minuteIndex]?.scrollIntoView({ behavior: 'auto', block: 'center' })
     }
   }, [selectedDate])
   ```

**視覚的改善**:
- 選択された時間が常に中央のブルー背景の中に表示される
- ユーザーが「09:45」を選択したら、その時間が中央に移動する
- カレンダーを開いた時点で、現在の設定時間が中央に表示される

---

## 🎯 実装順序

### Phase 1: 日付選択時の閉じない動作
1. `date-time-picker.tsx` の `handleDateSelect` を確認
2. 自動クローズの処理があれば削除

### Phase 2: 日時テキストをクリック可能にする
1. `center-pane.tsx` のレイアウトを修正
2. `mind-map.tsx` のレイアウトを修正
3. 日時テキストとカレンダーアイコンを同じトリガーでラップ
4. × ボタンの `stopPropagation` を確認

### Phase 3: 時間ホイールの自動スクロール
1. `TimeWheel` コンポーネントに `ref` を追加
2. `scrollIntoView` ロジックを実装
3. 初期表示時のスクロール位置を設定
4. 時間変更時のスクロール動作を実装

### Phase 4: 動作確認
1. ブラウザで動作確認
2. 各シナリオのテスト
   - 日付のみ選択 → カレンダーが開いたまま
   - 日時テキストをクリック → カレンダーが開く
   - 時間をクリック → 中央にスクロール

---

## ⚠️ 注意事項

1. **× ボタンのクリック伝播防止**
   - `e.stopPropagation()` を必ず呼ぶこと
   - × ボタンをクリックした時にカレンダーが開かないようにする

2. **ScrollArea との互換性**
   - `scrollIntoView` が `ScrollArea` コンポーネント内で正しく動作するか確認
   - 必要であれば、ScrollArea の内部スクロール位置を直接制御

3. **Hydration Error の再発防止**
   - クライアント専用のコードは `useEffect` 内に記述
   - `isMounted` フラグを活用

---

## 📝 期待される結果

### 修正前:
- 日付選択 → 自動的に閉じる → 時間を設定するために再度開く必要がある
- 日時テキストをクリック → 何も起きない
- 時間を選択 → スクロール位置は変わらない、選択した時間が画面外にある可能性

### 修正後:
- 日付選択 → カレンダーは開いたまま → すぐに時間を設定できる
- 日時テキストをクリック → カレンダーが開く
- 時間を選択 → 選択した時間が中央のブルー背景に移動する
- カレンダーを開いた時 → 現在の設定時間が中央に表示される

---

## ✅ 完了条件

- [ ] Phase 1: 日付選択後もカレンダーが開いたまま
- [ ] Phase 2: 日時テキストとカレンダーアイコンの両方でカレンダーが開く
- [ ] Phase 3: 時間選択時に中央のブルー背景に自動スクロール
- [ ] Phase 4: すべての動作が期待通りに機能する

---

この計画で実装を進めます。
