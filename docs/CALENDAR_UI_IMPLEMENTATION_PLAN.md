# CALENDAR UI Implementation Plan (No-Code)

この計画書は `docs/CALENDAR_UI_SPEC.md`（V6）を実現するための「実装手順」と「検証項目」を定義します。
**このファイル自体は実装を含みません**。

## 1. 目的
- V6仕様の「整列（7列）」と「コンパクトさ」と「安定（fixedWeeks）」を同時に満たす。

## 2. 作業手順（推奨）
### Step A: テーブル整列の崩れを根絶
- `Calendar` の `classNames` を見直し、`td/th` 側の固定幅（`w-9` 等）を削除。
- `table` に `table-fixed` を適用。
- `day` は `w-full + aspect-square` でセル追従。

### Step B: outside days / fixedWeeks / weekStartsOn を仕様通りに固定
- `weekStartsOn = 0`（日曜）
- `showOutsideDays = true`（薄く表示）
- outside days はクリック不可（pointer-events none 等）
- `fixedWeeks = true`

### Step C: 時間ホイールの見た目と密度を調整
- 幅は約90px固定。
- 「中央の選択」が視覚的に最も強い（白文字 + 背景）。
- 余白が大きすぎて“スカスカ”に見えない高さ/パディングへ。

### Step D: フッターをV6仕様に揃える
- 文字サイズは `text-xs〜text-sm`。
- 左 Ghost（キャンセル） / 右 Primary White（設定）。

## 3. 検証項目（Acceptance）
- **整列**: 「日」だけズレる/詰まる等が起きない。
- **outside days**: 表示はされるがクリックできない。
- **高さ安定**: 月送りしてもポップオーバーがガクつかない。
- **ホイール比率**: 右が90px程度で細く、中央強調が分かる。

