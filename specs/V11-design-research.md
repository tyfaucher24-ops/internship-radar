# V11 Design Research: "Editorial Terminal" polish for Internship Radar
_Researched 2026-10-21. Every pattern links a real source. Where the source covers a principle and not exact values, the numbers are marked **(our proposal)**._

## North star
Keep the current theme. Layer on a light **newspaper/editorial** skin (a serif for headlines only, a masthead, hairline rules) and a **market-ticker** data layer (tabular numbers, green/red deltas, rolling digits). The rule: **performance is the aesthetic**. Animate only transform and opacity, keep motion under 500ms, and keep UI type in a quiet sans.

Context: Awwwards' 2025 Site of the Year (and Users' Choice) was *Lando Norris* by OFF+BRAND. https://www.awwwards.com/annual-awards/winners. Awwwards winners are mostly immersive WebGL showcases (e.g., the Oct 2026 SOTDs at https://www.awwwards.com/websites/sites_of_the_day/). They're good for mood and a poor model for a fast, repeat-use database. The product sites below (Linear, Vercel, Stripe, Raycast, Robinhood, Bloomberg) fit our use case better.

---

## 1. Typography

### P1. Product UI in one neo-grotesk with light, tight display type (Linear, Vercel)
- Linear sets everything in Inter Variable, with a 400 / 510 / 590 weight ladder and negative tracking on display sizes (-1.056px at 48px, -1.408px at 64px). Elevation comes from 1px borders, not shadows. Sources: https://open-design.ai/plugins/design-system-linear-app/ , https://ai2.design/inspiration/linear
- Guidance across the genre: display type at weight 400–510, line-height 1.0–1.1, tracking -0.02 to -0.04em, never 700. Body 13–14px/1.45 in product UI. Mono eyebrows 11–12px uppercase with +0.08–0.12em tracking. **"One editorial serif hero line is allowed (Instrument Serif or Playfair at weight 400)."** https://pageproofer.com/inspiration/precision-dark/
- Why users love it: "The page doesn't describe speed; it performs it." https://www.meritweb.com/guides/linear-and-the-dark-page/
- Vercel's Geist system uses Geist Sans and Geist Mono (both on Google Fonts), grey-first tokens, and hairline borders. https://vercel.com/geist/introduction

### P2. Editorial serif for headlines only (NYT Cheltenham, The Atlantic)
- In 2003 NYT replaced "a miscellany of headline typefaces" with one family, Cheltenham, "to enhance legibility and bring a more orderly look… [and] convey a clear hierarchy." https://www.nytimes.com/2003/10/21/business/the-media-business-a-face-lift-for-the-times-typographically-that-is.html ; history: https://www.nytimes.com/2024/03/02/insider/cheltenham.html
- The Atlantic's 2019 redesign commissioned **Atlantic Condensed**, a serif inspired by its 1857 type, and cut the nameplate down to a single "A." https://www.theatlantic.com/press-releases/archive/2019/11/atlantic-makes-new-mark/601810/
- **Copyable free pairings (Google Fonts):**
  | Role | Option A (NYT-ish) | Option B (Atlantic-ish, condensed) | Option C (modern) |
  |---|---|---|---|
  | Masthead / H1 | **Playfair Display** 600–700 | **Libre Caslon Condensed** / **Old Standard TT** | **Instrument Serif** 400 |
  | Section heads, card titles | **Source Serif 4** 600 (opsz) | **Newsreader** 500 | **Fraunces** 500 (SOFT 0, WONK 0) |
  | UI / body / filters | **Inter** (or keep current sans) | **Inter** | **Geist** |
  | Numbers / ticker | **JetBrains Mono** or **IBM Plex Mono** | **Geist Mono** | Inter with `tabular-nums` |
- Rule: serif at 20px and up only (masthead, section titles, card company names if desired). Everything interactive stays sans. **(our proposal, consistent with the pageproofer "one serif line" guidance)**

### P3. Tabular numerals everywhere numbers align (Linear)
`font-variant-numeric: tabular-nums;` is mandatory on aligned columns. https://ai2.design/inspiration/linear. Apply it to the tracker spreadsheet, the match %, the ticker, and counts so digits don't jitter while they update.

---

## 2. Color and paper

### P4. A tinted base, not pure black or white (Linear)
Linear's base is #08090a (a "very deep blue-grey", not true black). Text is #f7f8f8, borders are rgba(255,255,255,0.05). Hierarchy comes from luminance steps, not hue. https://open-design.ai/plugins/design-system-linear-app/ , https://www.meritweb.com/guides/linear-and-the-dark-page/
**Paper tones (our proposal):** for a light editorial mode, use newsprint-like warm off-whites:
```css
--paper:      #f7f4ec;  /* page */
--paper-2:    #efeadf;  /* card / masthead band */
--ink:        #1a1a1a;  /* headlines */
--ink-2:      #4a4a4a;  /* body */
--rule:       #1a1a1a1f;/* hairline */
/* dark mode: keep current theme; add warmth via --rule: rgba(255,255,255,.08) */
```

### P5. Color carries meaning; amber for neutral data (Bloomberg)
The Terminal keeps its default amber for **non-semantic** information. Its accessible scheme swaps red/green for **blue/red** (up/down) for colour-vision-deficient users. https://www.bloomberg.com/company/stories/designing-the-terminal-for-color-accessibility/ ; amber origin: https://ted-merz.com/2021/06/26/amber-on-black/
→ Ticker labels and timestamps in amber (`#f5a623`-ish, **our proposal**). Green and red only for adds and closes. Add a "colour-blind safe" toggle that maps the match-grade scale to a blue→red ramp, and never rely on colour alone: pair it with an arrow or text (▲ ▼ NEW CLOSED).

### P6. Glanceable state through colour (Robinhood)
"The user can launch the app and glimpse the health and activity of the Stock Market without reading a single word." Green/red follows direction, and after hours the background shifts to a dusky grey. https://design.google/library/robinhood-investing-material
→ Match grades stay green-to-red. Expired or closed postings dim to a grey "after-hours" treatment (opacity .55 plus desaturation).

### P7. Accent gradients as faint glows, never fills (Linear, Stripe)
Linear uses accents "homeopathically… as ~3–4% radial glimmers." https://ai2.design/inspiration/linear. Stripe's WebGL gradient is one living brand moment on an otherwise calm white grid, and it pauses when off-screen. https://www.bram.us/2021/10/13/how-to-create-the-stripe-website-gradient-effect/
→ Behind the planet intro only: `radial-gradient(600px at 50% 0%, rgb(var(--accent)/.06), transparent)`.

---

## 3. Editorial structure (light touch)

### P8. Masthead + dateline + thin rules (NYT / Atlantic tradition)
NYT's Cheltenham work aimed at "traditional but less old-fashioned" order. https://www.nytimes.com/2003/10/21/business/the-media-business-a-face-lift-for-the-times-typographically-that-is.html. The Atlantic reduced its identity to one declarative mark. https://www.theatlantic.com/news/archive/2019/11/introducing-new-look-atlantic/601762/
**Copyable masthead (our proposal):**
```
──────────────────────────────────────────── (1px rule)
VOL. XI · WED, OCT 21, 2026 · 1,284 OPEN ROLES · UPDATED 2 MIN AGO   (mono 11px, caps, +0.1em)
                 Internship Radar                       (serif 40–48px, -0.02em)
════════════════════════════════════════════ (double rule: 3px double)
[ ticker strip ]
```
```css
.masthead{border-top:1px solid var(--rule);border-bottom:3px double var(--ink);padding:12px 0 10px;text-align:center}
.dateline{font:500 11px/1 "JetBrains Mono";letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.section-head{font-family:"Source Serif 4";font-weight:600;border-top:1px solid var(--ink);padding-top:8px}
.kicker{font:600 11px "Inter";letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
```
Use **kickers** (the small caps label above a headline) on cards: "FINTECH · NYC". Use **column rules** (`column-rule` or `border-left:1px solid var(--rule)`) between filter sidebar and grid. Avoid drop caps, faux-paper textures, and multi-column body text, because they hurt speed and scanability.

### P9. Six columns, not eight: less density reads easier (NYT, 1976)
NYT cut from eight to six columns to make the paper "easier to read… more accessible." https://web.archive.org/web/20220713004823/https:/www.nytimes.com/2020/01/06/reader-center/louis-silverstein-redesign.html
→ Cap the card grid at about 4 columns at 1440px, with a 24px gutter and 8px spacing base (**our proposal**).

---

## 4. Live ticker and numbers

### P10. Odometer rolling digits (Robinhood Ticker)
Robinhood's open-source Ticker animates each character like an odometer, handles resizing ("9999"→"10000"), and takes the shortest wrap-around path. Its requirements: no lag during scroll, low memory, simple API. https://github.com/robinhood/ticker/ , https://medium.com/robinhood-engineering/hello-ticker-20eaf6e51689
The detail people notice: the whole number turns green or red based on the overall delta, but **each digit rolls in its own direction**, and digits that don't change don't animate. https://matt-croak.medium.com/animate-your-digits-like-robinhood-2fd3e24bdc16. React reference: `stonk-ticker` (props `value`, `movement`, `constantKeys`). https://github.com/TaskSquirrel/stonk-ticker
**CSS approach (our proposal):** each digit is a `span` with `overflow:hidden; height:1em`, holding a vertical 0–9 strip that moves with `transform: translateY(-n em)` over `transition: transform 400ms cubic-bezier(.2,.8,.2,1)`. Flash the colour for 600ms, then settle to ink.

### P11. Scrolling tape strip of adds/closes/changes (Bloomberg / exchange tape)
The Bloomberg UX philosophy is to show dense data but "conceal complexity" with clear hierarchy and only incremental changes. https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/ , https://www.bloomberg.com/company/what-we-do/ux/
**Item format (our proposal):** `STRIPE ▲ NEW  SWE Intern · NYC  ·  JANE ST ▼ CLOSED  ·  CITADEL ● DEADLINE MOVED 11/15`
```css
.tape{height:28px;overflow:hidden;border-block:1px solid var(--rule);font:500 12px/28px "JetBrains Mono";font-variant-numeric:tabular-nums}
.tape-track{display:flex;gap:32px;width:max-content;animation:tape 60s linear infinite}
.tape:hover .tape-track{animation-play-state:paused}
@keyframes tape{to{transform:translateX(-50%)}}   /* duplicate items once for seamless loop */
.up{color:#16a34a}.down{color:#dc2626}.chg{color:#f5a623}
@media (prefers-reduced-motion:reduce){.tape-track{animation:none;overflow-x:auto}}
```
Pause on hover, make each item clickable through to its card, and show a "LIVE" dot that pulses with opacity (not scale) every 2s.

---

## 5. Motion, hover, and cards

### P12. Motion budget: transform/opacity only, <500ms, triggered on view (Stripe)
Stripe Connect animated only transform and opacity, used custom cubic-bezier easing, kept most effects under 500ms, used the Web Animations API for chained sequences, and triggered with IntersectionObserver instead of scroll listeners. https://stripe.com/blog/connect-front-end-experience
```css
:root{--ease-out:cubic-bezier(.2,.8,.2,1);--t-fast:120ms;--t-med:200ms;--t-slow:400ms}
```

### P13. Cards: hairline border, lift on hover, no heavy shadows (Linear, Vercel)
Linear gets elevation from 1px borders rather than drop shadows. https://ai2.design/inspiration/linear. Vercel's Geist uses hairline borders and quiet motion. https://vercel.com/geist/introduction
```css
.card{border:1px solid var(--rule);border-radius:10px;background:var(--paper-2);transition:transform var(--t-med) var(--ease-out),border-color var(--t-med)}
.card:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--ink) 30%,transparent)}
.card .grade{font-variant-numeric:tabular-nums}
.card .company{font-family:"Source Serif 4";font-weight:600;font-size:18px;letter-spacing:-.01em}
```
Card anatomy (our proposal): kicker (industry · city) → serif company name → sans role title → meta row in mono (deadline, posted) → match-grade pill at right.

### P14. Show the product, not decoration; speed is the delight (Raycast, Linear)
Raycast's refresh centres on a prominent search bar, bold outline icons, and compact modes, aiming at "fast, simple, delightful." https://www.raycast.com/blog/a-fresh-look-and-feel. pageproofer notes that Linear and Raycast use real, full-fidelity product UI as the hero. https://pageproofer.com/inspiration/precision-dark/
→ Add a ⌘K quick-search over companies/roles. The planet intro should collapse to the real grid within about 1.5s and be skippable, and it should play only on first visit (localStorage flag).

### P15. Personality in small, one-off moments (Arc / The Browser Company)
Arc's team deliberately leaves designers' "fingerprints" in one-off moments (playful onboarding, personalized membership cards) so the product feels alive. https://www.dive.club/ideas/what-makes-design-at-arc-so-unique , https://www.inverse.com/input/design/the-browser-company-arc-design-interview
→ Spend the delight budget on 2–3 moments only: the planet intro, a small confetti/"press stamp" when a tracker row moves to "Offer", and the daily dateline ("Morning edition" / "Evening edition" by time of day).

### Supporting references
- Notion: gestural, minimal line illustrations make abstract work feel human. https://www.notion.com/blog/the-thinking-behind-our-latest-brand-campaign. Could be used for empty states.
- Airbnb Cereal: large x-height and wide apertures for legibility at small UI sizes. https://karrisaarinen.com/posts/developing-airbnb-cereal/. This supports Inter for dense filters.
- Apple HIG: predictable, accessible motion; respect reduced motion. https://developer.apple.com/design/

## Implementation checklist
1. Load at most 3 font families (one serif, one sans, one mono) via Google Fonts with `display=swap` and preconnect, or self-host the woff2.
2. Tokens: paper/ink/rule/accent and up/down/chg, plus a CVD toggle (blue/red).
3. Masthead + dateline + double rule, then the tape strip under it.
4. `tabular-nums` globally on numeric cells, with rolling digits on header counts (open roles, new today).
5. Cards get hairline borders, a 2px lift, a serif company name, and a kicker.
6. Motion: transform/opacity only, ≤400ms, `prefers-reduced-motion` respected, intro once per user.
