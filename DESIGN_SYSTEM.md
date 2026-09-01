# Design System — Extracted Visual Language

Synthesized from 7 reference dashboards (dark SaaS admin panels, a light CRM/project tool, a mail client, and a support ticketing app). This is not a layout spec — it's the shared aesthetic DNA to apply to our existing structure.

## 1. Overall Mood/Tone

**Quiet, confident, professional-tool feeling** — closer to "engineered instrument" than "consumer app." Across both dark and light references the tone reads as: **calm, low-noise, high-legibility, restrained**.

What creates it:
- Near-flat surfaces with very low contrast between background and card (dark: `#0a0a0c` bg vs `#141416` card; light: `#f5f5f5` bg vs `#ffffff` card) — panels differentiate by a hair, not a shout.
- Content does the talking — big numbers, clear labels — chrome (borders, icons, dividers) stays quiet and thin.
- Color is used sparingly and functionally (status, one accent) rather than decoratively.
- Nothing glows, nothing has heavy drop shadows or gradients fighting for attention.

## 2. Color Language

**Philosophy: near-monochrome neutrals + one functional accent + reserved semantic colors.** Not "dark mode" or "light mode" as an identity — both exist across these refs, but the *same* palette logic underlies both: a tight neutral ramp carries 90% of the UI, and color is spent only where it means something (status, one CTA, one highlighted data point).

Proposed cohesive palette:

**Neutrals (the workhorse):**
- Dark theme: bg `#0a0a0d` → surface `#141417` → surface-raised `#1c1c20` → border `#2a2a2f` → text-muted `#8a8a92` → text `#f2f2f4`
- Light theme: bg `#f6f6f7` → surface `#ffffff` → border `#e8e8ea` → text-muted `#6b6b70` → text `#18181b`

**Accent (pick one, used sparingly):** a single mid-saturation accent (indigo/violet or blue) for primary actions, active nav state, and the one "hero" chart line — never more than one accent hue in view at once.

**Semantic (small, muted, not neon):**
- Success: muted green (`#34c77b`-ish)
- Warning: muted amber
- Danger: muted red/coral
- These appear as small deltas (+7.1%), status dots, and pills — never as large fills.

**Explicitly avoid:** saturated multi-color palettes, gradient backgrounds, neon glows. Color is a seasoning, not the base.

## 3. Typography Feel

- **Strong weight contrast**: hero numbers and page titles are bold/semibold and notably larger (28–36px) against everything else, which sits at regular/medium weight and small size (12–14px). This creates an immediate visual hierarchy — you know what to look at first.
- **Tight hierarchy, few steps**: roughly 3 sizes in play at once (large stat/title, medium label, small meta) — not a long type scale.
- **Neutral, tight letter-spacing**: default system-sans tracking on body text; labels and eyebrow text (e.g. "MAIN NAVIGATION", column headers) get slightly wider letter-spacing and are set in muted uppercase-or-small-caps-adjacent gray — a quiet section marker, not a loud label.
- Numbers are the typographic hero throughout — treat large metric figures as the most important text on any screen.

## 4. Spacing/Density Philosophy

**Moderate-to-compact density with disciplined rhythm** — not the airy generous-whitespace look, but not cramped either. These are working tools meant to show a lot of data per screen while staying scannable.

- Consistent internal card padding (~16–20px), consistent gaps between cards/sections (~16–24px).
- Table/list rows are compact (row height ~40–48px) with clear but thin separators — density favors rows-of-data over decorative spacing.
- Sidebar nav items are tightly stacked with small gaps, grouped by muted section labels rather than large spacers.

Suggested scale: `4 / 8 / 12 / 16 / 24 / 32 / 48` (px), used consistently rather than arbitrary one-off values.

## 5. Shape Language

- **Corners: soft, moderate rounding** — consistently in the 8–14px range on cards, inputs, and buttons (not sharp/boxy, not pill-rounded-everything). Avatars and small icon badges go fully circular/rounded as an exception.
- **Borders over shadows**: separation between surfaces is achieved mostly with a 1px subtle border (low-contrast, same-hue-as-background) rather than heavy drop shadows. Where shadows appear, they're soft, low-opacity, short-throw — used for popovers/dropdowns/modals only, not for resting cards.
- **Flat by default**: cards sit flush against the page; elevation is reserved for transient/overlay elements (dropdowns, tooltips, floating panels).

## 6. What to Explicitly IGNORE (product-specific, don't copy)

- Dashboard 1 (Lunor): the specific dashed/hatched-fill chart style, the exact contract-icon set, and the yellow folder-color-coding for sidebar items — product-specific iconography, not shared language.
- Dashboard 2 (Kravio): the green/red sparkline mini-charts inside stat cards and the specific breadcrumb ("Overview / Dashboard") pattern — one product's choice, not universal.
- Dashboard 3 (finance table app): the extremely dense, borderless spreadsheet-like row list and right-side record-detail-panel layout — this is a data-grid-specific pattern, not general dashboard structure.
- Dashboard 5 (O/M agency tool): the pixel-blurred/redacted content blocks (an artifact of the screenshot, ignore entirely) and the colored progress-dot row (health indicator) — too specific to that metric type.
- Dashboard 6 (Mantra, light): the purple-tinted active-nav pill and the large hero marketing-style project thumbnail cards — that's a portfolio/agency-tool layout choice, not a dashboard primitive.
- Dashboard 7 (mail client): the illustrated banner image ("Upgrade with AI") and email-specific two-pane list/reading layout — an inbox pattern, not applicable to a general dashboard.
- Dashboard 8 (support ticket app, macOS chrome): the browser-window frame itself (irrelevant), the three-pane ticket/conversation/order layout, and the colored progress-stepper ("Quited → Packed → Shipped → Delivered") — a support-ticket-specific widget, not a shared primitive.

**Bottom line**: take the neutral-heavy palette + single accent, the bold-number/quiet-label type contrast, the moderate rounded-corner + thin-border + flat-card shape language, and the compact-but-breathable spacing rhythm. Leave every product's specific chart type, icon set, and one-off widget behind — apply this language to our own existing dashboard structure and components as-is.
