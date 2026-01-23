# MindMap Interaction Rules

## Goals
- Keep task interaction stable and IME-friendly.
- Preserve existing layout and rendering logic (Dagre, ReactFlow).
- Avoid selection state loops or crashes.

## Core Modes
- **Selection Mode**: node selected, not editing.
  - Selection ring visible.
  - Caret should not blink.
  - Input should still accept IME composition on first key.
- **Edit Mode**: input editing.
  - Caret blinks.
  - Mouse selection allowed (double click).

## Click / Double Click
- **Single click**: select node and focus input (IME-first-key friendly).
- **Double click**: enter Edit Mode and move caret to end.

## IME Rules
- Do **not** inject first character via `setEditValue(e.key)`.
- Let `onCompositionStart` / `onChange` toggle editing.
- Input should remain mounted to avoid losing first composition key.

## Key Bindings (Selection Mode)
- `Enter`: add sibling (except root if disallowed by design).
- `Tab`: add child.
- `Delete/Backspace`: delete selected task.
- Arrow keys: keep existing tree navigation.

## Key Bindings (Edit Mode)
- `Enter`: confirm edit only (no sibling creation).
- `Tab`: confirm edit + add child.
- `Escape`: cancel edit and restore previous value.
- Respect `isComposing` to avoid IME breakage.

## Save Behavior
- UI updates immediately (optimistic).
- DB save runs in background (no UI blocking).
- Avoid double-save on blur + key confirm.

## Focus After Create/Delete
- After creating a node, focus it using `focusNodeWithPollingV2(..., preferInput=false)`.
- After delete, move focus to calculated neighbor for continuous delete.

## Stability Rules
- Do **not** overwrite `nodes[].selected` from local state.
- Keep ReactFlow selection state owned by ReactFlow.
- Keep Dagre layout logic intact.
