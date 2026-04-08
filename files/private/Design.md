# Design — Elite Last Principles

*Craft substrate. The proven defaults the best designers converge on. Not Alexandria-specific taste — that lives in a4 and Taste.md. This file is the physics of good design: shadow math, border logic, spacing systems, animation curves, contrast hierarchies, component patterns, performance, accessibility. First principles means knowing when to ride last principles.*

*Sources: Steve Schoger / Refactoring UI, Anthropic/Claude, Collins, Wonderful AI, Wispr Flow, Popcorn Space, RunCabinet, Self-Made Web Designer (3 videos), UI/UX concepts video, Avid taste article, Josh Comeau, Material Design 2/3, Apple HIG, Radix UI, Shadcn/ui, Linear, Stripe, Vercel Geist, WAI-ARIA APG, APCA research, perception science papers. Updated as new references are absorbed.*

---

## Shadows

Shadows communicate elevation. Most shadows look wrong because they're too dark, too spread, or have only one layer.

**Multi-layer shadows.** Every shadow needs at least two layers — a tight, dark shadow for edge definition and a large, soft shadow for ambient lift. The best sites use three layers (tight/medium/atmospheric — Collins, Stripe):

```css
/* Tailwind shadow utilities — underlying CSS values (Schoger/Wathan) */
/* shadow-sm */  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
/* shadow */     box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
/* shadow-md */  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
/* shadow-lg */  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
/* shadow-xl */  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
/* shadow-2xl */ box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);

/* Three-layer (Collins — realistic light simulation) */
0 2px 5px rgba(0,0,0,0.11),    /* tight edge */
0 9px 9px rgba(0,0,0,0.1),     /* medium body */
0 21px 13px rgba(0,0,0,0.06);  /* atmospheric */

/* Stripe — brand-tinted, aggressive negative spread */
0 2px 5px -1px rgba(50,50,93,0.25), 0 1px 3px -1px rgba(0,0,0,0.3);     /* small */
0 13px 27px -5px rgba(50,50,93,0.25), 0 8px 16px -8px rgba(0,0,0,0.3);  /* medium */
0 50px 100px -20px rgba(50,50,93,0.25), 0 30px 60px -30px rgba(0,0,0,0.3); /* large */
```

**Negative spread** pulls the shadow inward, preventing the halo effect. Key technique: `0 25px 50px -12px` — the `-12px` is what makes it feel grounded instead of floating. Stripe uses aggressive negative spread on every shadow.

**Offset is depth. Blur is atmosphere.** Research confirms: perceived depth scales linearly with shadow offset at ~1.3:1 (people perceive 30% more depth than the geometric offset). Blur has near-zero contribution to depth perception — it's the realism/quality signal. To make something feel twice as high, double the y-offset. Don't just increase blur.

**Vertical offset simulates overhead light.** The visual system assumes light from ~35-38 degrees. This maps to 2:1 to 3:1 y-to-x offset ratio. Always add y-offset.

**Warm-tinted shadows.** On colored or warm backgrounds, tint the shadow with the element's base color — not generic black. Stripe uses `rgba(50,50,93,0.25)` (desaturated indigo). RunCabinet uses `rgba(59,47,47,0.08)` (warm brown matching text color). This is the single biggest differentiator between "something feels off" and "this feels premium."

**Josh Comeau's shadow palette** — one variable swap for dark mode:
```css
:root {
  --shadow-color: 220deg 60% 50%;
  --shadow-elevation-low:
    0.3px 0.5px 0.7px hsl(var(--shadow-color) / 0.34),
    0.4px 0.8px 1px -1.2px hsl(var(--shadow-color) / 0.34),
    1px 2px 2.5px -2.5px hsl(var(--shadow-color) / 0.34);
  --shadow-elevation-medium:
    0.3px 0.5px 0.7px hsl(var(--shadow-color) / 0.36),
    0.8px 1.6px 2px -0.8px hsl(var(--shadow-color) / 0.36),
    2.1px 4.1px 5.2px -1.7px hsl(var(--shadow-color) / 0.36),
    5.1px 10.2px 12.8px -2.5px hsl(var(--shadow-color) / 0.36);
  --shadow-elevation-high:
    0.3px 0.5px 0.7px hsl(var(--shadow-color) / 0.34),
    1.5px 2.9px 3.7px -0.4px hsl(var(--shadow-color) / 0.34),
    2.7px 5.4px 6.8px -0.7px hsl(var(--shadow-color) / 0.34),
    4.5px 8.9px 11.2px -1.1px hsl(var(--shadow-color) / 0.34),
    7.1px 14.3px 18px -1.4px hsl(var(--shadow-color) / 0.34),
    11.2px 22.3px 28.1px -1.8px hsl(var(--shadow-color) / 0.34),
    17px 33.9px 42.7px -2.1px hsl(var(--shadow-color) / 0.34),
    25px 50px 62.9px -2.5px hsl(var(--shadow-color) / 0.34);
}
```
Layer count scales with elevation: low=3, medium=4, high=8. Geometric progression in offsets (doubling pattern). Change `--shadow-color` and every elevation adapts.

**Inner highlight.** `inset 0 1px 0 rgba(255,255,255,0.99)` on cards — old-school glossy-edge technique, almost invisible, adds dimensionality. Stripe also uses: `inset 0 1px 0 hsla(0,0%,100%,0.08)`.

**Animating shadows — never animate box-shadow directly.** It triggers repaint every frame. Use the pseudo-element technique:
```css
.card { position: relative; box-shadow: var(--shadow-elevation-low); }
.card::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  box-shadow: var(--shadow-elevation-high);
  opacity: 0; transition: opacity 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  z-index: -1; pointer-events: none;
}
.card:hover::after { opacity: 1; }
```
Both shadows exist in the DOM. Only `opacity` animates (compositor, GPU). 60fps guaranteed.

**Dark mode:** near-invisible. Replace shadows with subtle borders (`rgba(255,255,255,0.06-0.1)`) or lighter surface colors. Elevation in dark mode = surface color stepping, not shadows. Linear's approach: abandon shadows entirely in dark mode.

---

## Borders

**Most borders are unnecessary.** Three alternatives in order: (1) more spacing, (2) contrasting background colors, (3) a subtle shadow. Borders are the last resort.

**Low-opacity rings over solid borders.** Use text color at 5-10% opacity: `rgba(0,0,0,0.05-0.1)` light mode, `rgba(255,255,255,0.06-0.1)` dark mode. Anthropic uses 10% of `#141413`. Solid borders create a muddy effect when combined with shadows.

**Border radius encodes personality.** 0 = serious/formal. Large = playful/friendly. Consistent across all components at the same hierarchy level.

**Radius scale (proportional to element size):**
```
Tags, badges:          4-6px
Inputs, small buttons: 6-8px
Cards, buttons:        12-16px
Large cards:           20-24px
Section containers:    32-64px (organic, modern)
Pill shapes (CTAs):    9999px or 100px
```

**Section border-radius continuity.** Match radii between adjacent sections for visual flow. **Child radius <= parent radius** — concentric curves (Vercel rule).

**Accent borders for free polish.** Colorful top/left borders on cards, alerts, nav items. **Zebra striping** over table row borders.

---

## Spacing

**4px base unit.** Every spacing value is a multiple of 4. Google Material Design, Apple, Vercel, Linear all use this. You can always split in half.

```
4  8  12  16  20  24  32  40  48  64  80  96  128  160
```

**25% minimum gap** between adjacent scale values. Non-linear: fine granularity at small end, coarse at large end.

**Proximity = relatedness.** Spacing WITHIN a group must be tighter than spacing BETWEEN groups. This is how hierarchy works without borders.

**Section spacing:** 80-160px between major sections. Anthropic: `6rem` medium, `10rem` main. The single biggest amateur tell is cramped section spacing. Start with too much whitespace, then remove — never start tight.

**Fluid margins with clamp():**
```css
margin-inline: clamp(2rem, 1.08rem + 3.92vw, 5rem); /* 32px-80px */
```

**Auto-centering formula (Collins):**
```css
padding-inline: max(1.5rem, calc((100vw - var(--max-width)) / 2));
```

**Fluid spacing scale:**
```css
--space-xs: clamp(0.25rem, 0.5vw, 0.5rem);
--space-s:  clamp(0.5rem, 1vw, 0.75rem);
--space-m:  clamp(1rem, 3%, 1.5rem);
--space-l:  clamp(1.5rem, 6%, 3rem);
--space-xl: clamp(3rem, 12%, 6rem);
```

**Input/button height:** 36-48px. Match button height to input height for alignment.

**Form inputs on white surfaces:** off-white background (`#f5f5f5`) instead of borders. Labels: small, bold, uppercase, softer color.

**Input font-size >= 16px on mobile.** Prevents iOS Safari auto-zoom on focus.

---

## Typography

**Hierarchy through size and color, not decoration.** The most extreme approach: only weight 400, hierarchy purely through size and font pairing (Collins).

**The scale (hand-picked, not formula-driven for UI):**
```
Hero:      48-72px   wt 300-400   lh 0.85-1.1    ls -0.03 to -0.07em
H2:        32-48px   wt 400-500   lh 1.05-1.1    ls -0.02 to -0.05em
H3:        20-30px   wt 400-600   lh 1.1-1.25    ls -0.01 to -0.03em
Body:      16-18px   wt 400       lh 1.4-1.5     ls -0.005 to 0
Small:     13-14px   wt 400-500   lh 1.3-1.4     ls 0 to +0.01em
Caption:   12px      wt 400       lh 1.1-1.2     ls 0 to +0.02em
Labels:    12-13px   wt 600       lh 1.0          ls +0.05 to +0.1em (uppercase)
```

**Letter-spacing tightens as size increases.** Optical correction: `-0.07em` (tightest, large display) through `+0.1em` (loosest, uppercase labels). This is universal across every elite site.

**Line-height inversely proportional to font size.** Display: 0.85-1.1 (headlines breathe through margin, not line-height). Body: 1.4-1.5. Sub-1.0 headings for extreme density (Wispr: H1 at 0.85).

**Type scale ratios — when each works:**
```
Minor Third  1.200  Most versatile. Web apps.
Major Third  1.250  Marketing sites, cards.
Perfect Fourth 1.333  Landing pages, editorial.
Augmented Fourth 1.414  Hero sections, luxury.
Golden Ratio 1.618  Display only. Breaks past 4 levels.
```

**Line length:** 45-75 chars. `max-width: 65ch` (content-aware). For EB Garamond (low x-height), use `70ch` to hit actual 65-char sweet spot.

**Font pairing:** headline is the anchor (sets personality), not body — opposite of conventional advice. **X-height matching:** paired fonts must have x-heights within ~5%, or size-adjust one. EB Garamond x-height ~0.44 pairs poorly with Inter ~0.52; better with Lato ~0.47 or Source Sans ~0.48.

**Condensed headlines earn larger sizes.** Occupy less horizontal space — feel bold without sprawling. Resource: Fonts In Use for professional pairings.

**Fluid type with clamp():**
```css
font-size: clamp(2rem, 1.69rem + 1.31vw, 3rem); /* Anthropic pattern */
```
Always include a rem component — `vw` alone doesn't scale with browser zoom (accessibility failure).

**Container query units** for component-level fluid type:
```css
.card h2 { font-size: clamp(1.25rem, 3cqw + 0.75rem, 2rem); }
```

**`font-optical-sizing: auto`** on variable fonts — adjusts stroke contrast and spacing at different sizes automatically. The browser maps the `opsz` axis to font-size. Override manually only when you want display-cut refinement at a size the browser wouldn't trigger.

**Old-style figures for body text:** `font-variant-numeric: oldstyle-nums proportional-nums`. EB Garamond has beautiful old-style figures. Use lining figures (`lining-nums`) for headings and tables.

**Tabular numbers:** `font-variant-numeric: tabular-nums lining-nums` for data tables. Right-align numbers.

**OpenType features:** explore stylistic alternates (`ss01`-`ss20`). `font-feature-settings: "ss04" on, "ss05" on` can make a common font feel custom.

**Variable font weights:** use in-between weights like 550 (between medium/semibold). **`-webkit-font-smoothing: antialiased`** makes fonts ~0.5 weight thinner on Mac — bump to 420-450 if too thin.

**`text-wrap: pretty`** on paragraphs (kills orphans). **`text-wrap: balance`** on headings (equalizes line lengths, limited to 6 lines).

**`text-rendering: optimizeLegibility`** on headings only — causes jank on body text (>10K chars).

**Font rendering stack:**
```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-kerning: auto;
  font-variant-ligatures: common-ligatures contextual;
}
h1, h2, h3 { text-rendering: optimizeLegibility; }
```

**Font loading — eliminate CLS with metric overrides:**
```css
/* Values are approximate — calibrate with https://screenspan.net/fallback or next/font */
@font-face {
  font-family: 'EB Garamond Fallback';
  src: local('Georgia');
  size-adjust: 98.5%; ascent-override: 92%; descent-override: 25%; line-gap-override: 0%;
}
body { font-family: 'EB Garamond', 'EB Garamond Fallback', Georgia, serif; }
```
`font-display: swap` for primary text. `font-display: optional` for repeat visitors (zero CLS, ever). Always `preload` critical fonts with `crossorigin`.

---

## Color

**Design in grayscale first.** Add color last. Forces hierarchy through spacing, contrast, and size.

**Never pure black or pure white.** Warm near-black (`#141413`, `#1a1a1a`, `#393737`) and warm near-white (`#faf9f5`, `#fafafa`, `#f7f7f7`). Even text selection color can carry warmth: `rgba(204,120,92,0.5)`. (Anthropic, every reference site)

**OKLCH for all palette construction.** HSL lies about brightness — yellow at hsl(60,100%,50%) and blue at hsl(240,100%,50%) are 13x apart in perceived luminance despite identical "lightness." OKLCH is perceptually uniform:
```css
color: oklch(0.7 0.15 250);  /* L C H */
```
Gamut mapping is automatic — out-of-gamut colors degrade by desaturating, not shifting hue.

**Radix 12-step scale** — each step has exactly one purpose:
```
1  App background          7  Interactive border
2  Subtle background       8  Strong border
3  Component bg (normal)   9  Solid color (highest chroma)
4  Component bg (hover)   10  Solid color (hover)
5  Component bg (active)  11  Low-contrast text (Lc 60 on step 2)
6  Subtle border          12  High-contrast text (Lc 90 on step 2)
```

**9 shades per color** (100-900). Pick base (500), darkest (900), lightest (100), fill midpoints. **HSL saturation curve:** further from 50% lightness = more saturation needed. **Saturate your grays** — pure gray is dead. Add blue for cool, brown/yellow for warm. **Tinted gray scales** (Radix pattern): mauve, slate, sage, olive, sand — each gray tinted to complement a specific hue family. Use because of chromatic adaptation: untinted grays look wrong next to saturated colors.

**Opacity-based text hierarchy:**
```
High emphasis:   100% or 90%    (headlines, primary)
Medium emphasis: 87%            (important body — Google Material spec)
Standard:        70-80%         (body text)
De-emphasized:   60%            (secondary, skimmable)
Disabled/ghost:  38-40%         (hints, placeholders)
```

**60-30-10 rule.** 60% neutral, 30% secondary, 10% accent. One accent color used well beats five random colors.

**APCA contrast thresholds** (perceptually correct, replaces WCAG 2.x ratios for design):
```
Lc 90  Body text (14px/400 or 18px/300)
Lc 75  Minimum body text (16px/500 or 24px/300)
Lc 60  Content text, placeholder
Lc 45  Large headlines (36px+), detailed icons
Lc 30  Spot-readable, disabled text, copyright
Lc 15  Non-semantic dividers. Below = invisible.
```
APCA is polarity-aware (dark-on-light vs light-on-dark) and font-size-aware. Still verify WCAG 2.x for legal compliance.

**On colored backgrounds: hand-pick colors, never reduce opacity.** Opacity-based hierarchy (above) works on neutral backgrounds. On saturated/colored backgrounds, opacity reduction washes out — pick a color at the same hue with adjusted saturation/lightness. Exception: white text opacity on dark neutral backgrounds is fine for secondary text.

**Perceived brightness varies by hue.** `sqrt(0.299r^2 + 0.587g^2 + 0.114b^2) / 255`. Rotate hue toward nearest bright hue when lightening.

**`color-mix(in oklch)`** for dynamic palette manipulation — cleaner than manual rgba: `color-mix(in oklch, #1a1a1a 8%, transparent)`.

**`light-dark()` for theme colors** — one declaration, both modes:
```css
color: light-dark(#1a1a1a, #ece8e1);
```
Requires `color-scheme: light dark` on `:root`. Eliminates manual dark mode variable swapping for simple cases.

**Relative color syntax** for deriving variants from a base:
```css
--hover: hsl(from var(--accent) h s calc(l - 10%));
--tint: oklch(from var(--accent) calc(l + 0.2) calc(c * 0.5) h);
```
Eliminates pre-computed color variant scales for hover states, tints, shades.

**`@property` for animatable custom properties:**
```css
@property --gradient-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
.element { background: conic-gradient(from var(--gradient-angle), ...); transition: --gradient-angle 0.5s; }
```
Enables animating gradient angles, color stops, and other values that regular `--vars` can't transition.

**P3 wide gamut** via OKLCH — browser handles gamut mapping automatically.

**Colorblind-safe universal pair:** blue (#0077BB) and orange (#EE7733). Always encode information with color + shape + text.

---

## Animation & Motion

**Easing — never `linear` for UI motion.** Key curves:

```css
/* Material Design 3 Standard — the workhorse */
cubic-bezier(0.2, 0, 0, 1)

/* MD3 Emphasized Decelerate — the premium feel */
cubic-bezier(0.05, 0.7, 0.1, 1)

/* Apple deceleration (easeOutQuint) */
cubic-bezier(0.22, 1, 0.36, 1)

/* Smooth state transition (easeInOutCubic) */
cubic-bezier(0.65, 0, 0.35, 1)

/* Playful overshoot (easeOutBack) */
cubic-bezier(0.34, 1.56, 0.64, 1)

/* Collins signature */
cubic-bezier(0.215, 0.61, 0.355, 1)

/* Wonderful AI symmetric */
cubic-bezier(0.44, 0, 0.56, 1)
```

**Duration by context:**
```
Micro (hover, toggle):        100-150ms
State change (check, press):  150-200ms
Content reveal (dropdown):    150-200ms
Modal enter:                  200-300ms
Modal exit:                   150ms (exit always faster than enter)
Page transition:              200-300ms
Morph/shared element:         350-500ms
Scroll-scrub smoothing:       300-800ms
Shimmer sweep:                1500ms linear
Ambient/atmospheric:          30-50s infinite
```

**200ms is the universal sweet spot** — fast enough to feel instant, slow enough to feel intentional. (Anthropic)

**Spring physics** (for natural motion):
```
Apple default:     response 0.55, dampingFraction 0.825
Snappy:            stiffness 150+, damping 12+
Bouncy:            stiffness 150+, damping 5-8
Smooth:            stiffness 80-100, damping 15+
Critically damped: damping 60, mass 1, stiffness 200 (settles without overshoot)
```

**Scroll-triggered entrance:** fade + blur + slight translate. `opacity: 0.001` (not `0` — prevents layout collapse) with `filter: blur(10px) → 0` and `translateY(10px) → 0`. Short distances (10-20px).

**Staggered reveals:** 0.06-0.1s increments. MD rule: no more than 20ms apart. **Stagger overlap 60-80%** — each starts when previous is 20-40% complete.

**Motion choreography:** one focal point at a time. Enter top-left to bottom-right. Shared motion direction within groups. Exit before enter. Fastest first (the element the user interacted with responds immediately).

**CSS scroll-driven animations** (Chrome/Edge, not yet Firefox/Safari — progressive enhancement):
```css
.element {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
```

**View Transitions API:**
```css
.hero-image { view-transition-name: hero; }
::view-transition-group(hero) {
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
}
```

**FLIP technique** for layout animations: measure First, apply Last, Invert with transform, Play by removing inversion. Converts layout changes into compositor-only transform animations.

**Auto-height animation (the auto problem):**
```css
.accordion-content {
  display: grid; grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease-out; overflow: hidden;
}
.accordion-content.open { grid-template-rows: 1fr; }
.accordion-content > .inner { min-height: 0; }
```

**Hover states by element type:**
- Text/nav: opacity 0.4-0.8 (Collins: aggressive 0.4-0.6)
- Cards: lift 2px (`translateY(-2px)`) + shadow escalation, or `scale(1.04)`
- Buttons: `scale(0.98)` press-in, or darken on hover (not lighten)
- Images: `scale(1.05)` at 200ms
- Active/press: `scale(0.98)`

**Backdrop blur:** 15px standard, 60px heavy frosted. Pair with 10-30% opacity background.

**Only animate `transform` and `opacity`** for guaranteed 60fps. `filter` and `clip-path` are paint-only (usually fine). Everything else (`width`, `height`, `top`, `left`, `padding`, `margin`, `box-shadow`) triggers layout — avoid.

**120fps:** CSS animations run at display refresh rate. JS `requestAnimationFrame` is capped at 60fps. For 120fps on ProMotion, use CSS transitions or Web Animations API.

**`will-change` discipline:** apply before animation, remove after. Never `* { will-change: transform; }` — wastes GPU memory.

**Reduced motion:** `prefers-reduced-motion: reduce` — reduce, don't eliminate. Keep opacity fades. Remove parallax, zoom, scroll-triggered movement. Use `0.01ms` not `0s` (prevents JS callback breakage).

---

## Layout

**Max-width scale:**
```
Narrow content:  600-700px   (text, forms)
Small container: 900px
Standard:        1200-1440px
Wide:            1680px      (only if genuinely filling it)
```

**Grid system:** 12 columns desktop, 8 tablet, 4 mobile. CSS Grid for page layout, Flexbox for components. Gutters: 1-2rem.

**Three breakpoints is enough:**
```
Desktop:  >= 1024px (or 1200-1440px)
Tablet:   768-1023px (or 880px)
Mobile:   < 768px (or < 880px)
```

**`100svh` not `100vh`.** `vh` is broken on mobile (calculates against largest viewport, overflows when toolbars visible). `svh` = smallest viewport, guaranteed visible. `dvh` for full-screen modals only.

**Breakpoint elimination patterns:**
```css
/* Auto-fill responsive grid (no breakpoints) */
grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));

/* Switcher (pure-math wrapping) */
.switcher > * { flex-grow: 1; flex-basis: calc((30rem - 100%) * 999); }

/* Sidebar (intrinsic wrapping) */
.not-sidebar { flex-basis: 0; flex-grow: 999; min-inline-size: 50%; }
```

**Container queries** for component-level responsiveness:
```css
.card-container { container-type: inline-size; }
@container (min-width: 400px) { .card { flex-direction: row; } }
```

**Subgrid** for nested alignment (card headers/bodies/footers align across grid):
```css
.card { display: grid; grid-template-rows: subgrid; grid-row: span 3; }
```

**Content-visibility for performance:**
```css
.section { content-visibility: auto; contain-intrinsic-size: auto 500px; }
```
7x rendering improvement. `auto` keyword remembers last rendered size.

**Sticky reveal footer:** main content `border-bottom-radius: 64px`, footer `position: sticky; bottom: 0`. Content scrolls away to reveal footer.

**Logical properties:** `margin-inline`, `padding-block`, `inset`. Future-proof and semantically clearer. Keep physical properties for visual effects tied to screen geometry (shadows, transforms).

**`@starting-style` for entry animations** (no JS needed):
```css
dialog[open] {
  opacity: 1; transform: scale(1);
  @starting-style { opacity: 0; transform: scale(0.95); }
  transition: opacity 0.3s, transform 0.3s, display 0.3s allow-discrete;
}
```
Replaces JavaScript-driven entry animations for dialogs, popovers, and `display: none → block` transitions.

**Popover API** (native, no JS positioning):
```html
<button popovertarget="menu">Open</button>
<div id="menu" popover>Content</div>
```
Auto-manages top-layer, light-dismiss, focus, and `::backdrop`. Use for tooltips, dropdowns, menus. Combine with CSS anchor positioning for placement.

**`:has()` for parent selection:**
```css
.card:has(img) { grid-template-rows: auto 1fr; }  /* cards with images get different layout */
form:has(:invalid) button[type="submit"] { opacity: 0.5; }  /* disable submit when form invalid */
```

**`field-sizing: content`** for auto-growing textareas (Chrome/Edge, not yet Firefox/Safari):
```css
textarea { field-sizing: content; min-height: 3lh; max-height: 10lh; }
```

**Z-index scale:**
```
Base: 0  |  Dropdown: 100  |  Sticky: 200  |  Modal: 300  |  Toast: 400  |  Tooltip: 500  |  Nav: 999
```

---

## Buttons

**Three-tier hierarchy:** Primary (solid fill, ONE per section), Secondary (outline/low-contrast), Tertiary (link-styled).

**Padding ratio: horizontal = 2x vertical.** `padding: 12px 24px`. Universal.

**Pill radius** (`border-radius: 100px`) is the current convergence for CTAs.

**Hover behavior (pick one per site):** darken (not lighten), `scale(0.98)` press-in, full inversion, or background shift only.

**One CTA per scroll viewport.** Hero, nav, then every 2-3 scroll-seconds.

**Glow CTAs:** brand gradient behind button with `filter: blur(4px)`, `inset: -10px`, `opacity: 0 → 1` on hover.

**Inline highlight:** `box-shadow: inset 0 -25px 0 0 var(--accent)` — animatable text highlight.

**Destructive actions** don't need big red buttons unless destruction IS the primary action.

---

## Icons

**Size = line-height of adjacent text.** Never scale small icons (16-24px) beyond 2x — enclose in background shape instead. **Softer color** than adjacent text (icons carry more visual weight).

---

## Navigation

**Frosted glass nav:** `position: fixed` + 10-34% opacity background + `backdrop-filter: blur(15-60px)`. Nav height: 48-68px.

**Scroll offset for anchored headings:** `scroll-margin-top: 5rem` (or nav height + padding) on heading targets. Prevents fixed nav from covering the heading on anchor jump.

**Spinner show-delay:** 150-300ms before showing, 300-500ms minimum visible time (prevents flash). (Vercel)

---

## Forms & Inputs

**Three-state escalation (Linear pattern):** rest (fill only, no border) → hover (border appears) → focus (ring appears). Three-state > two-state.

**Input consensus values:** height 36-48px, horizontal padding 12-16px, border-radius 6-8px, font-size 14px minimum, focus ring `box-shadow: 0 0 0 2px var(--ring)` at 40% opacity.

**Validation — "reward early, punish late":** field had error, user edits → validate immediately (reward). Field was valid, user edits → wait for blur (punish late). Error text: below input, 6px gap, `opacity 0→1` + `translateY(-4px)→0` at 150ms. Shake: 200-400ms, `translateX(+/-4px)`. Debounce real-time validation at 300ms.

**Select:** native on mobile (`@media (pointer: coarse)`), custom on desktop.

**Toggle/switch:** track 36x20px, thumb 16x16px, travel 16px. `transition-transform` 150ms.

**Tooltip:** delay 300ms (not Radix default 700ms), `sideOffset: 4px`, fade+translate 150ms. `skipDelayDuration: 300ms` for subsequent tooltips.

**Toast (Sonner):** duration 4000ms default. Formula: `500ms per word + 1000ms buffer`. Max 3 stacked. Hover pauses timer. Over 140 chars: require manual close.

**Modal:** backdrop `bg-black/50` + `backdrop-blur(4px)`. Enter 200-300ms ease-out from `opacity: 0, scale: 0.95`. Exit 150ms ease-in (always faster). Width: `max-w-lg` (512px) standard. Use `inert` attribute on content behind modal.

**Command palette:** `Cmd+K` / `Ctrl+K`. List height animates at 100ms. Arrow nav, Enter select, Escape close. Empty state for zero matches.

**Floating UI middleware order:** offset (gap) → flip (overflow) → shift (nudge) → arrow. All at 8px.

**Skeleton shimmer:**
```css
background: linear-gradient(90deg, hsl(0 0% 88%) 25%, hsl(0 0% 95%) 50%, hsl(0 0% 88%) 75%);
background-size: 200% 100%; animation: shimmer 1.5s infinite linear;
```
`background-attachment: fixed` syncs all skeletons. Pulse alternative: `opacity 1→0.5→1` at 2s.

**Progress indicators:** <1s none, 1-3s spinner, 2-10s skeleton, >10s determinate bar. **Fake progress:** jump 30%, crawl to 90%, hold, snap 100% (YouTube/Vercel/NProgress pattern).

---

## Images & Media

**Aspect ratios:** 16:9 hero/video, 4:3 cards, 1:1 avatars, 3:2 editorial. `aspect-ratio: auto 16 / 9` for CLS prevention (placeholder ratio while loading).

**Hero video > hero image.** `loop preload="none" muted playsinline` + poster image.

**Image formats:** AVIF (40-50% smaller than JPEG), WebP (25-35% smaller), JPEG fallback. Use `<picture>` with `<source>` elements.

**Never `loading="lazy"` on LCP image.** Give it `fetchpriority="high"` instead.

**Image overlays:** `linear-gradient` (image top, solid bottom) + progressive `blur()`.

**No image > bad image.** Dark mode: `brightness(0.85)` filter.

---

## Dark Mode

**Design simultaneously or dark-first.** Not an afterthought.

**Surface elevation in OKLCH L (not shadows):**
```
Base:       L 10-12%    App background
Navigation: L 13-15%    Sidebars, nav
Card:       L 17-19%    Content containers
Modal:      L 21-23%    Overlays
Tooltip:    L 25-27%    Popups
```
Each step +3-4 L points. (See Color section for "never pure black" — `#141413`, `#1a1a1a`)

**Text on dark:** primary `rgba(255,255,255, 0.87-0.9)`, secondary `0.6-0.75`, disabled `0.38`. Use both lightness AND opacity for more perceived tier separation.

**Borders flip:** `rgba(255,255,255, 0.06-0.1)`. **No shadows.** Surface color IS the elevation.

**Reduce saturation** 10-20% on accent colors (Helmholtz-Kohlrausch: saturated colors appear neon on dark). **Chips/badges:** dim saturation and brightness.

**OKLCH lightness inversion** works because OKLCH is perceptually uniform:
```css
:root { --l-surface: 0.97; --l-text: 0.15; }
@media (prefers-color-scheme: dark) { :root { --l-surface: 0.12; --l-text: 0.93; } }
body { background: oklch(var(--l-surface) 0.01 250); color: oklch(var(--l-text) 0 0); }
```

---

## Gradients & Textures

**Near-invisible directional gradients** create micro-depth. `linear-gradient(268deg, #fff, #fafafa)` reads flat but adds subtle dimensionality.

**Section transition:** `linear-gradient(180deg, rgba(accent, 0.5) 0%, #fafafa 40%)` — resolves quickly, atmospheric wash.

**Conic gradients** for CTA glow. **Fade-to-background** for marquee/carousel edges.

**Noise overlay** at 1-3% opacity, ~80px tile repeat. **Dot grid:** `radial-gradient(circle, color 0.5px, transparent 0.5px)`. **Scanlines** at 1.5% opacity. All register subconsciously, never consciously.

**Glass badges:** semi-transparent bg + semi-transparent border. **Depth must be subtle** — never compete with primary content.

---

## Scroll & Interaction

**Pin-and-animate (Apple pattern):** section pins (`position: sticky` or GSAP pin), content animates through states. Scroll runway: 150-300vh per pin. 3-5 beats max. Scrub smoothing: 0.3-0.8s.

**Horizontal scroll:** native `scroll-snap-type: x mandatory` preferred. `scroll-snap-stop: always` prevents skipping. Show 20-40px peek of next slide.

**Bento grid:** `grid-template-columns: repeat(4, 1fr)`, `grid-auto-rows: 200px`. Hero card 2x2 minimum. Gap 12-20px. Radius 16-24px. Hover `scale(1.02-1.03)`.

**Marquee:** duplicate content, `translateX(-50%)`, 30-60s cycle. `background-attachment: fixed` idea works here too.

**Cursor effects:** lerp following (0.08-0.12 = luxurious, 0.15-0.25 = responsive). `@media (pointer: fine)` gate. **Magnetic buttons:** pull strength 0.2-0.4.

**CSS-only scroll progress:**
```css
.bar { animation: grow linear; animation-timeline: scroll(root); }
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

**Carousel craft:** autoplay min 5s, pause on hover, stop after one cycle. Transition 300-400ms ease-out.

---

## Performance

**Core Web Vitals:** LCP <= 2.5s, INP <= 200ms, CLS <= 0.1.

**14KB critical CSS** — first TCP round trip. If critical CSS fits in 14KB compressed, first paint doesn't wait for a second network round trip.

**Font loading:** `font-display: swap` for text, `optional` for repeat visitors. Preload critical fonts with `crossorigin`. Subset fonts (full Inter ~300KB, latin subset ~20KB).

**GPU compositing:** only `transform` and `opacity` run on compositor thread. Everything else triggers layout or paint. Use FLIP to convert layout animations into transforms.

**CLS prevention:** always set `width`/`height` on images. `aspect-ratio` for responsive containers. Font metric overrides. `position: fixed/sticky` doesn't cause CLS. Transform animations don't cause CLS.

**Perceived performance thresholds:** <100ms instant, 100ms-1s show subtle indicator, 1-10s show skeleton/progress, >10s user abandons.

**Hover prefetch:** start fetching on `mouseenter` (~200-300ms head start). Next.js does this by default.

**`content-visibility: auto`** on below-fold sections. 7x rendering improvement.

**Preload/prefetch/preconnect:** max 3-4 preloads (they compete). Preload must be used within 3s. `preconnect` to critical third-party origins.

**Scroll listeners:** always `{ passive: true }` — tells browser the handler won't `preventDefault()`, enabling smooth scrolling.

**Never `transition: all`** — explicitly list properties. `all` is expensive and catches unintended properties.

---

## Accessibility

**Focus states:** never remove `outline`. `box-shadow: 0 0 0 3px var(--focus)` + `outline: 3px solid transparent` (invisible normally, visible in forced-colors when box-shadow is stripped).

**`inert` attribute** on content behind modals — replaces manual focus trap + aria-hidden. Browser handles tab trapping natively.

**Live regions must pre-exist in DOM.** Inject content into them, don't inject the region. Clear and refill for repeat messages. One status region + one alert region per page.

**`role="combobox"` goes on the input itself** (ARIA 1.2), not a wrapper div.

**Roving tabindex** for composite widgets (tabs, toolbars, menus): one item `tabindex="0"`, all others `-1`. Arrow keys move focus.

**Touch targets:** 44-48px minimum. Expand via padding or pseudo-element (`::after { inset: -12px }`) without inflating visual size.

**Reduced motion = reduce, not eliminate.** Keep opacity fades, color transitions, small scale (<5%). Remove parallax, zoom, scroll-triggered movement, continuous rotation.

**Forced colors:** `@media (forced-colors: active)` — shadows stripped, use system color keywords (`Canvas`, `CanvasText`, `Highlight`). Add borders where shadows were the only separator.

**`prefers-reduced-transparency: reduce`:** replace glass/blur with opaque backgrounds.

**rem for font sizes** (respects user's browser font preference). `px` ignores it. At 200% zoom: no horizontal scroll, no overlapping, no truncation.

**Skip links:** `<a href="#main" class="skip-link">Skip to main content</a>` — visually hidden (`position: absolute; left: -9999px`), visible on `:focus`. Target needs `tabindex="-1"` or Chrome moves viewport but doesn't set focus.

**Custom checkboxes/radios:** `appearance: none` (not `display: none`) keeps the element in the accessibility tree while allowing full CSS styling.

**`color-scheme: dark`** on `<html>` — themes native scrollbars, form controls, and selection colors to match dark mode.

**`lang` attribute on `<html>`** — 6th most common accessibility error on the web. Always set it.

**Empty links and buttons** — 4th and 5th most common errors. Every button/link needs visible text content or `aria-label`. Icon-only buttons require `aria-label`.

**Never use ARIA to replicate semantic HTML.** `role="button"` on a `<div>` = wrong. Use `<button>`. Pages using ARIA average 34% more accessibility errors than pages without (WebAIM Million 2025). ARIA is a last resort when HTML semantics are insufficient.

**Screen reader differences:** VoiceOver sometimes drops `aria-live="polite"` during interaction (use `assertive` cautiously on iOS). `role="alert"` elements must exist in DOM before content injection. Tables with `display: grid/flex` need explicit `role="table/row/cell"`.

---

## Visual Composition

**One star per page.** One dominant visual element anchors attention. Everything else serves it.

**Visual rhyming.** Repeat brand-derived shapes across nav, buttons, cards, icons, backgrounds.

**De-emphasize to create hierarchy.** Don't over-emphasize primary — reduce secondary/tertiary instead. Weight and contrast are inversely related.

**Sprinkle, don't drench.** Any decorative element — one instance is seasoning, a full page is the dish.

**Semantic != visual.** An h1 doesn't need to be the biggest thing on the page.

---

## Process

**Start with too much whitespace, then remove.** Build features, not layouts. Design mobile-first at ~400px. Empty states and loading states are not edge cases.

**Constrained systems produce professional results.** Define scales upfront (spacing, type, color, shadows, radius) and only pick from those scales. The system IS the design skill.

**Curly quotes** (" ") over straight quotes (" ") in all copy. **Non-breaking spaces** between numbers and units: `10&nbsp;MB`. **Ellipsis convention:** "Rename..." (has follow-up), "Saving..." (loading state). **Persist UI state in URL** — filters, tabs, pagination survive refresh and Back/Forward.

---

## The Meta-Principle

Every default in this file is a convergence point — where the best designers end up after enough iterations. They are substrates, not constraints. When Alexandria's specific objective function demands divergence (and it will — warm cream over clinical white, serif editorial over sans-serif SaaS, ghost text over filled buttons, elevation through color layering over shadows), diverge deliberately and know what you're diverging from.

The craft is invisible. The taste is visible. This file handles the craft so the taste can do its work.
