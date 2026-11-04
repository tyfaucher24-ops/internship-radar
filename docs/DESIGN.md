# Intern Index design rules (V18)

The look is a calm finance site: quiet surfaces, one accent, numbers in a mono face, colour only when it means something.

## One token file
- `tokens.css` holds every colour, type size, radius, spacing step, font and motion value. `style.css` and `site.css` read tokens and never hard-code new colours.
- Light mode is the default. `html.dark` (set by boot.js from the saved choice) overrides **colour tokens only**. Sizes, spacing, fonts and radii are identical in both themes, so switching theme never moves anything.
- `html.cb` swaps the up/green colour for blue for colour-blind users.

## Colour
| Token | Use |
|---|---|
| `--c-bg`, `--c-bg-2`, `--c-surface` | page, sunken panel, card |
| `--c-line`, `--c-line-2` | hairlines and borders |
| `--c-ink`, `--c-ink-2` | headings and body text |
| `--c-mut`, `--c-mut-2` | secondary text (all pass WCAG AA on bg and surface) |
| `--c-pri` family | the single accent: primary buttons, focus ring, links |
| `--c-up` / `--c-down` / `--c-move` | green/red/amber, only for meaning (new, closed, changed) |

Never use green or red for decoration. Grades use their own scale and stay harsh and varied.

## Type
- `--font` (Geist) for text, `--font-mono` (JetBrains Mono) for counts, dates and money.
- Sizes: `--fs-s` 13, `--fs-m` 15, `--fs-l` 18, `--fs-xl` clamp(28–40). No other sizes.

## Space and shape
- Spacing steps `--sp-1`…`--sp-6` = 4, 8, 12, 16, 24, 32 px.
- Radius `--r` 10px for cards and inputs, `--r-pill` for chips.
- Motion `--dur` .15s; everything respects `prefers-reduced-motion`.

## No layout jumps
- Reserve space for anything that loads late: skeleton cards match card height, counts use fixed-width mono digits, images carry width/height.
- Banners and toasts overlay; they never push content down after first paint.

## States
- Empty: say what is empty and give one next step (clear filters, browse all).
- Loading: skeleton cards, then a plain "Slow connection" note after 8 s.
- Error: say what failed and offer a retry button. Saved items and the tracker keep working offline.

## Accessibility
- Every view passes axe (WCAG 2.1 AA) in both themes at 1440, 1280, 768 and 390 px.
- Visible focus ring on every control; everything reachable by keyboard; Esc closes dialogs.
