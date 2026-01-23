# MindMap UX Rules (Single Source of Truth)

This document defines the ONLY valid UX rules for the MindMap (ReactFlow) interactions.
All future changes MUST conform to these rules to ensure "Native App-like" performance.

## 1. Text Input Rules (Zero Latency & IME-Safe)
- **Typing Trigger**:
  - Typing any character key while in Selection Mode MUST immediately switch to Edit Mode and capture that character (fixing the "h-a" missing char issue).
  - Do NOT require a double-click to start typing.
- **IME Handling**:
  - The first keystroke that triggers Edit Mode must be passed to the input so IME composition starts correctly from the first character.
  - Never block native key events during composition.
- **Confirming Input**:
  - `Enter` confirms input (including IME commit) and returns to **Selection Mode** (Blue Border).
  - Save operations must be Optimistic (update UI immediately, save to DB in background).

## 2. Focus Management (The "Flow")
- **Create Sibling/Child**:
  - Upon creation, focus MUST move to the new node and **IMMEDIATELY enter Edit Mode** (caret blinking).
  - User should not need to press Enter again to start typing.
- **Delete**:
  - After deleting a node, focus automatically moves to an adjacent node to allow continuous deletion:
    - Priority: Upper Sibling > Lower Sibling > Parent.
  - Focus recovery must be instant (use `requestAnimationFrame` if DOM needs to settle).

## 3. Keyboard Shortcuts
- **Selection Mode (Blue Border)**:
  - `Enter` → Create Sibling (Vertical) -> **Auto Edit**.
  - `Tab` → Create Child (Horizontal) -> **Auto Edit**.
  - `Arrow keys` → Navigate tree.
  - `Delete/Backspace` → Delete node -> Focus adjacent.
  - `Any Character Key` → Switch to Edit Mode -> Input character.
- **Edit Mode (Typing)**:
  - `Enter` → Confirm input -> Return to **Selection Mode**.
  - `Tab` → Confirm input -> Create Child -> **Auto Edit**.
  - `Escape` → Cancel edit -> Return to Selection Mode.
- **IME Composition**:
  - `Enter` determines the converted text (does NOT exit Edit Mode).

## 4. Selection / Visual State
- **Selection Mode**: Shows a clear blue border (ring).
- **Edit Mode**: Shows the text input caret.
- Selection must persist correctly after drag/drop or layout updates.

## 5. Non-Negotiable Constraints
- Do not remove Dagre layout logic.
- Do not break Marquee multi-select or bulk delete.
- **Performance**: No artificial delays (e.g., waiting for DB) in UI interactions.
