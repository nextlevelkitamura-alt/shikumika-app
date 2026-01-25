# MindMap UX Rules (Single Source of Truth)

This document defines the ONLY valid UX rules for the MindMap (ReactFlow) interactions.
All future changes MUST conform to these rules to ensure a "Professional Native App-like" experience.

## 1. Core Philosophy: "Fluidity & Optimism"
* **Optimistic UI (Absolute Rule)**:
  - All actions (Create, Edit, Move, Delete, Fold) MUST update the local UI **instantly (0ms latency)**.
  - Database synchronization happens asynchronously in the background. Never block the UI.
* **Natural Navigation**:
  - The canvas must feel like an infinite sheet of paper, responsive to fluid gestures.

## 2. Navigation & View Control (New!)
* **Trackpad Panning**:
  - **Two-finger drag** on the trackpad MUST pan the canvas smoothly (like Google Maps or Figma).
  - Do not require holding Space or clicking scrollbars.
* **Zooming**:
  - Pinch-to-zoom support.
  - `Cmd` + Scroll (or `Ctrl` + Scroll) for zooming via mouse wheel.

## 3. Node Manipulation (New!)
* **Marquee Selection (Drag to Select)**:
  - Clicking and dragging on the empty canvas MUST draw a selection box (Blue rectangle).
  - All nodes touching the box become **Selected**.
  - **Bulk Actions**: Once multiple nodes are selected:
    - `Delete` key deletes ALL selected nodes instantly.
    - Dragging one node moves ALL selected nodes (if visual grouping is supported).
* **Drag & Drop Reordering**:
  - Users can drag a node and drop it onto another node to **Reparent** (attach as child).
  - Visual feedback (highlighting target node) is required during drag.
  - Update layout instantly upon drop.
* **Folding/Unfolding (Collapsible)**:
  - Every parent node must have a visible **"Expand/Collapse" button** (handle) near the connection line.
  - Clicking it toggles the visibility of all descendant nodes.
  - Default state: Expanded.

## 4. Text Input Rules (Excel-Like Overwrite) - 3-Stage Model
* **State Transitions**:
  ```
  Selection → Editing → Confirmed → New Node
  ```
  - **Selection Mode**: Node is focused but not editable. Blue outline only.
  - **Editing Mode**: Text is editable. Blue outline + blinking caret.
  - **Confirmed Mode**: Text saved, waiting for next action. Blue outline + green check icon.

* **Typing Trigger**:
  - In Selection/Confirmed Mode, typing any character key MUST:
    1. Switch to Edit Mode immediately.
    2. **Overwrite** the entire existing text with the typed character.
    3. Start IME composition correctly (Fixing "h-a" issue).
* **Edit Trigger**:
  - `Double Click` or `F2` enters Edit Mode with **All Text Selected**.

* **Enter Key Behavior (3-Step)**:
  - **Editing Mode + Enter**: Save text and enter Confirmed Mode.
  - **Confirmed Mode + Enter**: Create new sibling node below.
  - **Selection Mode + Enter**: Create new sibling node below.

## 5. Focus Management (The "Flow")
* **Creation Flow**:
  - `Enter` (Sibling) / `Tab` (Child) -> **Instant Focus** on new node (Edit Mode).
  - Do NOT wait for DB response.
* **Deletion Flow**:
  - Focus moves to adjacent neighbor immediately.

## 6. Technical Constraints
* **ReactFlow Config**:
  - Enable `panOnScroll={true}` for trackpad support.
  - Enable `selectionOnDrag={true}` for marquee selection.
  - Enable `nodesDraggable={true}` (but ensure text selection inside node doesn't trigger drag).
* **Performance**:
  - Use `useOptimistic` or local state for Drag&Drop and Folding to ensure 60fps animations.

## 7. Keyboard Shortcuts Summary (3-Stage Model)
| Mode | Key | Action | UI Response |
| :--- | :--- | :--- | :--- |
| **Selection** | `Char Key` | → Editing (overwrite) | **Instant** |
| | `Enter` | Create Sibling | **Instant** |
| | `Tab` | Create Child | **Instant** |
| | `Delete` | Bulk Delete | **Instant** |
| **Editing** | `Char Key` | Type text | **Instant** |
| | `Enter` | → Confirmed | **Instant** |
| | `Tab` | Save + Create Child | **Instant** |
| | `Escape` | Cancel → Selection | **Instant** |
| **Confirmed** | `Enter` | Create Sibling | **Instant** |
| | `Tab` | Create Child | **Instant** |
| | `Char Key` | → Editing (overwrite) | **Instant** |
| **Drag Canvas** | | Marquee Select | **Fluid** |
| **Drag Node** | Drop on Node | Reparent (Move) | **Instant Layout** |