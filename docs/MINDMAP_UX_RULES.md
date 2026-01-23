# MindMap UX Rules (Single Source of Truth)

This document defines the ONLY valid UX rules for the MindMap (ReactFlow) interactions.
All future changes MUST conform to these rules.

## 1. Text Input Rules (IME-Safe)
- **Selection Mode**: clicking a task focuses the input but does not blink the caret.
- **Edit Mode**: caret blinks only when explicitly entering edit mode (e.g. double-click).
- **IME first keystroke**:
  - Never inject the first character via `setEditValue(e.key)` on keydown.
  - Let the focused input receive the native key/composition events.
  - `onChange` / `onCompositionStart` may toggle editing, but must not break IME composition.
- **Confirming input**:
  - Enter confirms (including IME conversion) and returns to Selection Mode.
  - Save is optimistic in UI; DB save is delayed in the background (no UI blocking).

## 2. Focus Management
- **Create Sibling/Child**:
  - After creation, focus moves to the new node using `focusNodeWithPollingV2(..., preferInput=false)`.
  - New nodes start in Selection Mode (caret not blinking).
- **Delete**:
  - After delete, focus moves to an adjacent node to allow continuous deletion:
    - If an upper sibling exists → focus upper sibling.
    - Else if siblings remain → focus the bottom-most sibling.
    - Else → focus parent, then group as fallback.
  - Use a `requestAnimationFrame` wrapper to ensure DOM is ready.

## 3. Keyboard Shortcuts
- **Selection Mode**:
  - Enter → create sibling (vertical).
  - Tab → create child (horizontal).
  - Arrow keys → tree navigation via `onNavigate`.
  - Delete/Backspace → delete selected node.
- **Edit Mode**:
  - Enter → confirm input and return to Selection Mode.
  - Tab → confirm input and create child; focus new node (Selection Mode).
  - Escape → cancel edit, revert label, return to Selection Mode.
- **IME composition**:
  - Never execute Enter/Tab actions while `isComposing` is true.

## 4. Selection / Visual State
- Do NOT override ReactFlow selection via `nodes[].selected`.
- Task selection must be visually clear (ring/glow).
- Selection should not be lost during save or focus changes.

## 5. Non-Negotiable Constraints
- Do not remove Dagre layout or existing Focus Polling logic.
- Do not break Marquee multi-select or bulk delete.
- Keep all existing node creation/edit/delete functionality intact.

