# Daily Chart Modes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `bars`, `line`, and `area` daily spend modes to the dashboard while keeping `rows` as the default alpha view.

**Architecture:** Extend the existing server-rendered dashboard route to accept a `chart` query parameter and pass a normalized mode into `renderDashboard`. Keep all rendering inside `apps/server/src/ui.ts` using small helper functions that reuse the existing normalized daily data, avoiding any new charting dependency or API shape changes.

**Tech Stack:** TypeScript, Express, server-rendered HTML, Vitest, Supertest, SQLite test store.

### Task 1: Add dashboard regression tests for chart mode selection

**Files:**
- Modify: `apps/server/test/dashboard.smoke.test.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/server/src/ui.ts`
- Test: `apps/server/test/dashboard.smoke.test.ts`

**Step 1: Write the failing test**

```ts
it("renders bars mode when requested and falls back to rows for invalid values", async () => {
  const bars = await request(app).get("/?chart=bars");
  expect(bars.text).toContain("Daily spend (bars)");
  expect(bars.text).toContain('aria-current="page">Bars<');

  const invalid = await request(app).get("/?chart=banana");
  expect(invalid.text).toContain("Daily spend (stacked by vendor)");
  expect(invalid.text).toContain('aria-current="page">Rows<');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/server/test/dashboard.smoke.test.ts`
Expected: FAIL because `chart` is ignored and no mode selector exists.

**Step 3: Write minimal implementation**

Add chart query parsing in `apps/server/src/app.ts`, pass a normalized mode into `renderDashboard`, and add a compact chart mode selector plus mode-specific title text in `apps/server/src/ui.ts`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run apps/server/test/dashboard.smoke.test.ts`
Expected: PASS for the new selector/fallback behavior.

### Task 2: Implement bars mode

**Files:**
- Modify: `apps/server/src/ui.ts`
- Test: `apps/server/test/dashboard.smoke.test.ts`

**Step 1: Write the failing test**

```ts
it("renders daily spend in stacked vertical bars", async () => {
  const response = await request(app).get("/?chart=bars");
  expect(response.text).toContain("Daily spend (bars)");
  expect(response.text).toContain("data-chart-mode=\"bars\"");
  expect(response.text).toContain("2026-03-02");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/server/test/dashboard.smoke.test.ts`
Expected: FAIL because no bars markup exists yet.

**Step 3: Write minimal implementation**

Render a simple per-day bar strip using existing `visibleDays`, with stacked vendor segments inside each bar and date labels beneath.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run apps/server/test/dashboard.smoke.test.ts`
Expected: PASS.

### Task 3: Implement line and area modes

**Files:**
- Modify: `apps/server/src/ui.ts`
- Test: `apps/server/test/dashboard.smoke.test.ts`

**Step 1: Write the failing test**

```ts
it("renders line and area chart modes", async () => {
  const line = await request(app).get("/?chart=line");
  expect(line.text).toContain("data-chart-mode=\"line\"");
  expect(line.text).toContain("Daily spend (line)");

  const area = await request(app).get("/?chart=area");
  expect(area.text).toContain("data-chart-mode=\"area\"");
  expect(area.text).toContain("Daily spend (area)");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/server/test/dashboard.smoke.test.ts`
Expected: FAIL because no line/area markup exists yet.

**Step 3: Write minimal implementation**

Build an SVG polyline/path from total daily spend values. Reuse the same scaled points for `line` and `area`, with `area` filling the space under the line.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run apps/server/test/dashboard.smoke.test.ts`
Expected: PASS.

### Task 4: Verify the full dashboard behavior

**Files:**
- Modify: `openspec/changes/add-daily-chart-modes/tasks.md`
- Test: `apps/server/test/dashboard.smoke.test.ts`

**Step 1: Run the focused test suite**

Run: `pnpm vitest run apps/server/test/dashboard.smoke.test.ts`
Expected: PASS with all dashboard smoke tests green.

**Step 2: Mark OpenSpec tasks complete**

Update `openspec/changes/add-daily-chart-modes/tasks.md` from `- [ ]` to `- [x]` for finished work.

**Step 3: Run broader server verification**

Run: `pnpm vitest run apps/server/test/api.test.ts apps/server/test/dashboard.smoke.test.ts`
Expected: PASS so the route/query changes do not break existing server behavior.
