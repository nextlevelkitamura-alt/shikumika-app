# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Shikumika（仕組み化）** = "Systematization" - an advanced task management tool designed to help users build repeatable systems for their work.

### Core Philosophy

1. **MindMap-first UI**: Tasks are visualized as a hierarchical mind map, enabling intuitive understanding of project structure and dependencies
2. **Planned vs Actual**: Every task has `estimated_time` (予定) and timer-tracked `actual_time` (実績) - the gap reveals opportunities for systematization

### Key Differentiators

- **Visual hierarchy**: Goals → Projects → TaskGroups → Tasks (nested up to 6 levels)
- **Exclusive timer**: Only one task can be timed at once, enforcing focus and accurate measurement
- **Native-app feel**: Optimistic UI with 0ms latency for all interactions

Built with Next.js 16 (App Router), React 19, ReactFlow, and Supabase.

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Critical Rule: MINDMAP_UX_RULES.md

**Before modifying MindMap-related code, you MUST read `docs/MINDMAP_UX_RULES.md`.**

This is the Single Source of Truth for UX behavior. Key principles:
- **Optimistic UI is absolute**: All actions (Create, Edit, Move, Delete, Fold) must update locally with 0ms latency
- **Never block UI** for database operations - sync asynchronously
- If existing code conflicts with the Rules, rewrite the code to match the Rules

When implementing changes that affect UX behavior:
1. Read `docs/MINDMAP_UX_RULES.md` first
2. If the change requires new behavior, UPDATE the rules file FIRST
3. Then implement code that strictly adheres to the rules

## Architecture

### Data Model (Hierarchical)

```
Goals → Projects → TaskGroups → Tasks (with parent_task_id for nesting)
```

- **Goals**: Top-level objectives
- **Projects**: Belong to a goal, contain task groups
- **TaskGroups**: Containers for tasks within a project
- **Tasks**: Support parent-child nesting (up to 6 levels via `parent_task_id`)

### Key Files

**Data Flow:**
- `src/app/dashboard/page.tsx` - Server component, fetches all data from Supabase
- `src/app/dashboard/dashboard-client.tsx` - Client component, manages selection state and passes data down
- `src/hooks/useMindMapSync.ts` - **Central hook for all CRUD operations** with optimistic updates

**UI Components:**
- `src/components/dashboard/mind-map.tsx` - ReactFlow-based MindMap visualization with Dagre layout
- `src/components/dashboard/center-pane.tsx` - Task list view with drag-and-drop (hello-pangea/dnd)
- `src/components/dashboard/left-sidebar.tsx` - Goal/Project navigation
- `src/components/dashboard/right-sidebar.tsx` - Calendar view

**Shared State:**
- `src/contexts/TimerContext.tsx` - Task timer with exclusive control (only one timer can run at a time)

### Timer System (Planned vs Actual)

The timer is central to the "systematization" goal:
- `estimated_time` (minutes): User's prediction before starting
- `total_elapsed_seconds`: Accumulated actual time from timer
- `actual_time_minutes`: Calculated from elapsed seconds

**Exclusive control**: Starting a new timer prompts to stop the current one - prevents accidental parallel tracking

### Optimistic Update Pattern

All mutations follow this pattern in `useMindMapSync.ts`:
1. Generate client-side UUID immediately
2. Update local state instantly (optimistic)
3. Fire async database call
4. On error: rollback local state and show alert

Example (createTask):
```typescript
const optimisticId = crypto.randomUUID();
setTasks(prev => [...prev, optimisticTask]); // Instant local update
return optimisticTask; // Return immediately for focus

// Background sync
(async () => {
  try {
    await supabase.from('tasks').insert({...});
  } catch (e) {
    setTasks(prev => prev.filter(t => t.id !== optimisticId)); // Rollback
  }
})();
```

### Auto-completion Logic

When a task is marked done, `useMindMapSync.ts` automatically:
- Completes parent task if ALL siblings are done
- Uncompletes parent task if any child becomes incomplete

## Database (Supabase)

- Schema: `supabase/schema.sql`
- Migrations: `supabase/*.sql`
- RLS enabled: Users can only CRUD their own data

### Key columns for tasks:
- `parent_task_id`: null for root tasks, UUID for child tasks
- `priority`: 1-5 (nullable)
- `estimated_time`: minutes (integer)
- `total_elapsed_seconds`, `last_started_at`, `is_timer_running`: Timer fields

## Branch Strategy

- `develop`: Daily development (Vercel does NOT deploy)
- `main`: Production only (triggers Vercel deployment)

Merge to main only after `npm run build` succeeds locally.

## UI Framework

- Tailwind CSS 4 with tw-animate-css
- Radix UI primitives (Dialog, Dropdown, Select, Popover, Tabs, etc.)
- lucide-react for icons
- date-fns for date formatting

## TypeScript Types

All database types are defined in `src/types/database.ts` matching the Supabase schema.
