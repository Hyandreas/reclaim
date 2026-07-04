# Reclaim Visual System Notes

Designer 1 handoff for Vultr Project A. Scope: demo app visual system only.

## Design Position

Reclaim should feel like a revenue assurance workbench used by a telecom expense analyst during a bright, high-pressure month-end review. Use a light, warm operating surface with crisp cool-gray structure, dense evidence, and restrained color. The rail is the signature proof surface: it must make backend planning, skipped stages, deterministic tools, citations, and approvals visible without looking like an AI chat product.

Avoid dark cyber dashboards, purple AI glow, marketing hero composition, glass panels, gradient text, decorative side stripes, and generic metric-card grids.

## Palette

Use OKLCH tokens. Keep green reserved for approved recovery and final locked counter states.

```css
:root {
  color-scheme: light;

  --surface-page: oklch(97.2% 0.009 82);
  --surface-panel: oklch(94.8% 0.007 250);
  --surface-raised: oklch(99% 0.006 82);
  --surface-inset: oklch(91.8% 0.008 250);

  --text-primary: oklch(24% 0.013 252);
  --text-secondary: oklch(43% 0.012 252);
  --text-muted: oklch(58% 0.011 252);
  --text-inverse: oklch(96% 0.006 82);

  --border-subtle: oklch(86% 0.011 250);
  --border-strong: oklch(73% 0.018 250);
  --focus-ring: oklch(62% 0.14 245);

  --action-primary: oklch(53% 0.13 246);
  --action-primary-hover: oklch(47% 0.13 246);
  --citation: oklch(56% 0.12 224);
  --planning: oklch(58% 0.09 262);

  --warning: oklch(72% 0.15 76);
  --warning-surface: oklch(95% 0.04 82);
  --danger: oklch(58% 0.16 31);
  --danger-surface: oklch(95% 0.03 31);
  --success: oklch(53% 0.12 151);
  --success-surface: oklch(94% 0.035 151);

  --shadow-soft: 0 1px 2px oklch(20% 0.01 252 / 0.08), 0 8px 24px oklch(20% 0.01 252 / 0.06);
}
```

State mapping:

- `Idle`: neutral surfaces, muted statuses, counter at graphite.
- `Running`: primary blue for current row and active rail card only.
- `Planning`: muted violet badge so it is distinct from retrieval and citations.
- `Skipped`: cool gray surface, dashed full border, opacity no lower than 70%.
- `Ambiguous`, `Needs review`, `Deadline expiring`: amber surface and amber text, always paired with text labels.
- `Excluded`: neutral gray, not red.
- `Approved`: success green for lock state, final counter, and approval badge only.
- `Fallback`: citation blue chip with "pre-rendered highlight" text in the drawer metadata.

## Typography

Use one product UI family: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`. Use `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` only for circuit IDs, BANs, timestamps, formulas, and JSON-ish trace values.

Suggested fixed scale:

- Display counter: 32px, 700, line-height 1.05, tabular nums.
- Page title or selected case title: 20px, 650, line-height 1.2.
- Section heading: 13px, 700, line-height 1.2, uppercase optional only for chrome labels.
- Body: 14px, 450, line-height 1.45.
- Dense row text: 12.5px, 500, line-height 1.25.
- Badges and buttons: 12px, 650, line-height 1.
- Fine metadata: 11px, 600, line-height 1.2.

Use `font-variant-numeric: tabular-nums` for money, percentages, timers, minutes, and confidence values. Keep prose blocks under 70ch; data cells may be denser.

## Layout

Desktop is a single-screen workbench:

```css
.app-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: 48px minmax(0, 1fr);
  background: var(--surface-page);
  color: var(--text-primary);
}

.workspace {
  display: grid;
  grid-template-columns: minmax(300px, 344px) minmax(420px, 1fr) minmax(360px, 420px);
  min-height: 0;
}
```

Top strip:

- 48px high, full-width, compact.
- Left: Reclaim wordmark, `Deployed on Vultr`, corpus version.
- Center: run timer, retrieval mode, health indicator.
- Right: live recovery counter and `Run audit` button.
- Counter starts graphite, animates during running, freezes green only after approval.

Left queue:

- Fixed-width pane with sticky column labels and scrollable rows.
- Row height 48 to 56px. Fit roughly 40 rows through dense scrolling, not tiny illegible type.
- Each row shows circuit ID, BAN, location, month, MRC, route chip, status, amount.
- 2 to 3 live rows get a stronger border and live dot. Preprocessed rows remain visibly part of the same pipeline but quieter.

Center rail:

- The rail owns the most visual attention.
- Use a vertical event sequence with numbered steps or status glyphs, not decorative stripes.
- Rail cards are 8px radius, 1px full border, white-raised surface, 12 to 14px padding.
- Each card has timestamp, stage name, source/tool badge, short output, status/confidence badge, and optional citation chip.
- Current card gets a primary-blue full border and subtle background tint. Completed cards are neutral. Skipped cards stay in place and explain why.

Right memo:

- Treat it like an exportable claim packet, not a dashboard card.
- Use a document-like white surface on warm page background, with section dividers and compact field pairs.
- Keep the amount, circuit, ticket IDs, formula, citations, confidence terms, and approval controls visible without scrolling on a 14-inch laptop when possible.
- Approval controls sit at the bottom as a sticky action band only after a memo is selected.

## Components

Buttons:

- Primary: solid `--action-primary`, 6px radius, 36px height, 14px horizontal padding, white-tinted text.
- Secondary: raised neutral with full 1px border.
- Destructive or override: neutral by default, danger border/text on hover or explicit dangerous action.
- Loading: keep width stable, show a small progress glyph and label such as `Running`.

Route chips:

- `clean`: neutral blue-gray.
- `deep review`: planning violet.
- `already credited`: neutral gray.
- `deadline`: amber.
- `needs review`: amber with stronger text.
- Use text plus icon; never rely on chip color alone.

Rail badges:

- Tool badge: small outlined pill with icon, for example calculator, database, file-search, shield-check.
- Source badge: cool gray filled pill for `planner`, `retrieval`, `calculator`, `database`, `approval`.
- Confidence badge: neutral until below threshold, amber under `0.80`.

Citation chip:

- Blue outlined chip with file icon and compact label like `MSA 4.2`.
- Opens a right-side or over-memo source drawer instantly.
- Drawer shows document name, page or section, highlighted clause image, and the memo line it supports.
- Do not use a modal for the core demo citation moment.

Memo fields:

- Use two-column field pairs for stable facts.
- Use a monospace formula block for credit math.
- Use a compact confidence breakdown with three horizontal rows: retrieval match, ambiguity resolution, billing certainty.
- Approval reason textarea should have a visible character floor: placeholder examples are okay, but final approval requires typed content.

Tables and rows:

- Use hover background, selected background, focus ring, and active state.
- Keep row height stable across all statuses.
- Use skeleton rows for loading. Avoid centered spinners.

## Icon Treatment

Use Lucide-style icons if available. Keep them understated:

- 16px default, 18px for pane headings, 20px only in primary empty states.
- Stroke width 1.75.
- Round caps and joins.
- Pair icons with labels for critical states: skipped, deadline, excluded, approved, needs review.
- Suggested icons: `Server`, `Database`, `FileSearch`, `Calculator`, `Clock`, `AlertTriangle`, `CheckCircle`, `Ban`, `ReceiptText`, `Lock`, `ExternalLink`.

## Motion

Operational, fast, and state-driven:

- Rail card reveal: 180ms opacity plus 6px translateY.
- Row status change: 160ms background and border transition.
- Counter increment: 180ms stepped number update, then 120ms settle.
- Citation drawer: 180ms transform and opacity, no delay.
- Approval freeze: under 250ms, counter turns green and lock icon appears.

Use `cubic-bezier(0.16, 1, 0.3, 1)` for reveals. Do not animate layout dimensions. For `prefers-reduced-motion`, use opacity-only transitions and instant number updates.

## Responsive Behavior

Breakpoints:

- `>= 1180px`: full three-pane grid.
- `900px to 1179px`: queue left, rail center, memo as a slide-over panel opened from selected case or memo queue.
- `640px to 899px`: two tabs for `Queue` and `Rail`, memo opens as full-height sheet.
- `< 640px`: task tabs: `Queue`, `Trace`, `Memo`; top strip wraps to two rows with counter and run button always visible.

Rules:

- Preserve the reasoning rail sequence on every viewport.
- Keep `Run audit`, current route, current status, and recovery counter reachable without horizontal scrolling.
- Tables become compact row summaries on mobile; do not squeeze every column.
- Citation drawer becomes a full-screen sheet on mobile with close button first in tab order.

## Accessibility

- Minimum contrast: 4.5:1 for body text, 3:1 for large text and non-text indicators.
- All icon-only controls need accessible names and hover/focus tooltips.
- Focus ring: 2px `--focus-ring` with 2px offset, visible on all controls.
- Rail event stream should use `aria-live="polite"` and avoid interrupting typing in the approval reason.
- Status changes must be represented by text and icon, not color alone.
- Click targets: 36px minimum for dense desktop controls, 44px on touch layouts.
- Approval cannot submit without a typed reason, and the error should be inline next to the textarea.
- The source drawer must trap focus while open if it overlays content; if it docks inline beside the memo, normal tab order is acceptable.

## Demo Composition

First 30 seconds need visible proof:

1. Top strip shows Vultr deployment, corpus version, retrieval mode, timer, and counter.
2. Queue shows the imported portfolio immediately, not an empty setup screen.
3. The clicked live row shows `deep review` while another live row shows `skip - clean`.
4. The rail shows `Plan completed` with selected stages and stop conditions.
5. A skipped card remains visible with a reason.
6. The calculator card shows `99.80% vs 99.9% SLA`.
7. The citation chip opens a highlighted clause without waiting on live PDF rendering.

The design should make this line visually undeniable: the plan changes the backend path, not just the narration.
