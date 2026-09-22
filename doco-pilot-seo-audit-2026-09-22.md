# doco-pilot.vercel.app — SEO / GEO / AEO Audit & Fix Tracker

**Audit date:** 2026-09-22
**Last updated:** 2026-09-22
**Scores at audit time:** SEO 2/10 · GEO 3/10 · AEO 2/10

This file is a living tracker. As issues get fixed, their status changes from
🔴 Open → 🟢 Fixed, with a note on what was done and when.

---

## Executive summary

DocoPilot is a genuinely well-built product with strong, honest, specific
landing page copy — but almost none of it is visible to Google, Bing, or AI
answer engines. The site is a pure client-side-rendered React SPA:
view-source returns only `<title>DocoPilot</title>` and an empty `<div>`,
with no meta description, no Open Graph tags, and no schema.org markup
anywhere. There is no real `robots.txt` or `sitemap.xml` (both URLs silently
serve the same empty app shell, returning HTTP 200, which makes the gap easy
to miss).

The comparison table (doco-pilot vs. Portainer vs. Coolify/Dokploy) and the
security section are genuinely citable, differentiated content — once
crawlable, comparatively little extra work is needed to start ranking.

---

## Pages audited

| URL | Type | Notes |
|---|---|---|
| `/` | Homepage / Landing | Rich single-page copy, rendered entirely client-side |
| `/robots.txt` | Crawl directives | Did not exist — fell through to SPA shell |
| `/sitemap.xml` | Sitemap | Did not exist — fell through to SPA shell |
| `#features` `#how` `#security` `#pricing` `#compare` | In-page anchors | Not separate crawlable URLs |
| `/login` `/register` `/dashboard` | App routes | Correctly behind auth, not marketing content |

---

## Priority fix list

| # | Priority | Issue | Dimension | Status |
|---|---|---|---|---|
| 1 | 🔴 Critical | No `<title>`/meta description/Open Graph tags in `index.html` | SEO/GEO | 🟢 Fixed |
| 2 | 🔴 Critical | No real `robots.txt` / `sitemap.xml` | SEO | 🟢 Fixed |
| 3 | 🔴 Critical | Landing page is fully client-rendered — crawlers see empty HTML | SEO/GEO/AEO | 🟢 Fixed |
| 4 | 🟠 High | No Organization / SoftwareApplication JSON-LD schema | GEO | 🟢 Fixed |
| 5 | 🟠 High | Pricing/security/compare sections aren't real indexable routes | SEO | 🔴 Open |
| 6 | 🟡 Medium | No FAQ section / FAQPage schema | AEO | 🟢 Fixed |
| 7 | 🟡 Medium | Headings are statements, not questions (no PAA targeting) | AEO | 🟡 Partial |
| 8 | 🟢 Quick win | Logo/screenshot alt text is empty or generic | SEO | 🟢 Fixed |
| 9 | 🟢 Quick win | No plain "doco-pilot is a ___" definition sentence | AEO | 🟢 Fixed |

Only #5 remains open — turning `#pricing` / `#compare` / `#security` anchors into real indexable routes. That's a bigger structural change (separate pages instead of anchors on one page) and lower urgency now that the whole landing page is crawlable as one rich document.

---

## Detailed findings

### SEO

| Signal | Finding | Status |
|---|---|---|
| Title tag | Only "DocoPilot" — no keywords, no value prop | 🔴 Missing |
| Meta description | Not present | 🔴 Missing |
| Heading hierarchy | Good H1/H2s exist in React source but don't reach crawlers | 🔴 Missing |
| Canonical tag | Not present | 🔴 Missing |
| robots.txt / sitemap.xml | Don't exist as static files | 🔴 Missing |
| Viewport meta | Present and correct | 🟢 Good |
| Image alt text | Logo `alt=""`, screenshot alt is generic | 🟡 Needs attention |
| Internal links | Nav links are in-page anchors, not real URLs | 🟡 Needs attention |
| Open Graph / Twitter Card | None present | 🔴 Missing |
| HTTPS | Served over HTTPS via Vercel | 🟢 Good |

### GEO

| Signal | Finding | Status |
|---|---|---|
| Author / team info | No About/Team page; GitHub repo is only identity signal | 🔴 Missing |
| Organization schema | No JSON-LD anywhere | 🔴 Missing |
| Trust signals | No testimonials/press — reasonable for an early project | 🟡 Needs attention |
| Factual density | Specific claims (AES-256-GCM, HMAC, JWT, $5/mo) — strong once crawlable | 🟢 Good |
| Clear claims up front | Hero states value prop plainly | 🟢 Good |
| Entity clarity | Minor "doco-pilot" vs "DocoPilot" inconsistency | 🟡 Needs attention |
| Comprehensiveness / originality | Honest comparison table vs. named competitors is genuinely citable | 🟢 Good |
| Crawlability (JS rendering) | Fully client-rendered, no SSR/pre-render fallback | 🔴 Missing |

### AEO

| Signal | Finding | Status |
|---|---|---|
| Direct-answer paragraphs | Good quotable lines exist but not under question headings | 🟡 Needs attention |
| Definition pattern ("X is...") | No plain definition sentence near the top | 🟡 Needs attention |
| List / table content | Comparison table is a strong snippet candidate | 🟢 Good |
| FAQ schema | None | 🔴 Missing |
| HowTo schema | 3-step setup flow is HowTo-shaped but unmarked | 🔴 Missing |
| Question-phrased headings | All headings are statements | 🟡 Needs attention |

---

## What's working well

- Clear, specific value proposition in the first sentence of the hero, no filler.
- Honest, specific comparison table against real named competitors — the kind of content AI answer engines like to cite.
- Security section lists concrete, verifiable technical claims instead of vague marketing language.
- Transparent "Early and honest" status banner builds trust rather than overselling — good E-E-A-T instinct.
- HTTPS enabled by default via Vercel hosting.

---

## Not assessed here

- **Core Web Vitals / real page load performance** — run [pagespeed.web.dev](https://pagespeed.web.dev) against the live URL.
- **Backlink profile / domain authority** — check via Ahrefs, Semrush, or Google Search Console.
- **Actual indexing status** — check Google Search Console once verified.

---

## Changelog

- **2026-09-22** — Initial audit completed. Tracker created.
- **2026-09-22** — Fixed #1: added real `<title>`, meta description, canonical, Open Graph, and Twitter Card tags to `client/index.html`.
- **2026-09-22** — Fixed #2: added `client/public/robots.txt` and `client/public/sitemap.xml`, and fixed `client/vercel.json`'s catch-all rewrite (it was sending `/robots.txt` and `/sitemap.xml` requests to `index.html`, which is why they returned HTTP 200 with the empty app shell instead of 404 or real content — this was the actual root cause).
- **2026-09-22** — Fixed #4: added `SoftwareApplication` JSON-LD schema to `index.html` (static, so it reaches crawlers now).
- **2026-09-22** — Fixed #6/#7 (partial): added an FAQ section to `Landing.jsx` with 5 question-phrased headings and matching `FAQPage` JSON-LD schema. Still client-rendered — won't help crawlers until #3 is fixed.
- **2026-09-22** — Fixed #8: added descriptive alt text to logo and dashboard screenshot images.
- **2026-09-22** — Fixed #9: added a plain "doco-pilot is a ___" definition sentence to the hero paragraph.
- **2026-09-22** — Verified `npm run build` succeeds and `dist/index.html`, `dist/robots.txt`, `dist/sitemap.xml` all contain the expected content.
- **2026-09-22** — Fixed #3 (the critical one): added `client/scripts/prerender.js`, run automatically via `npm run build` (now `vite build && npm run prerender`). It uses `react-dom/server`'s `renderToStaticMarkup` (via `vite-node`, so JSX/CSS imports resolve) to render `Landing.jsx` at build time and injects the resulting HTML into `dist/index.html`'s `<div id="root">`. The client still hydrates normally on top of it via `createRoot` in `main.jsx` — no behavior change for real users, but `view-source:` and crawlers now see the full landing page (hero, features, security, comparison table, pricing, FAQ + FAQPage schema) instead of an empty div. Verified via `npm run preview`: homepage returns HTTP 200 with ~19.5KB of real HTML (up from 3.5KB), and the FAQPage JSON-LD is present in the served page source.
- **2026-09-22** — Scores re-estimated post-fix: SEO ~7/10, GEO ~7/10, AEO ~6/10 (informal re-check, not a full re-audit). Remaining gap is almost entirely #5.
- **2026-09-22** — Fixed a lint regression the prerender work introduced: the first version of `scripts/prerender.js` used `vite-node`, whose SSR JSX transform didn't apply the project's automatic JSX runtime, forcing an explicit (and then unused-per-ESLint) `import React from "react"` in `Landing.jsx`. Replaced the approach with `vite build --ssr scripts/prerender.js` (bundled through the same plugin pipeline as the real app build, output to a temp `.prerender/` dir that's deleted after running), which needs no source workarounds. `Landing.jsx`'s import is back to normal. Verified clean: `npm run lint` (0 errors), `npm test` (41/41 passing), `npm run build` (dist/index.html still ~19.5KB prerendered).
