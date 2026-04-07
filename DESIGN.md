# Alexandria — Design System

*For any ai agent building Alexandria's interfaces. Two layers: solid foundations (the 8/10 floor every modern site needs), then Alexandria's intentional breaks (where the thesis demands divergence). Know the rules, then break them on purpose.*

---

## 1. Identity

Alexandria is Greek philosophy infrastructure. Not a SaaS. Not a tech startup. Not a blog. The design should feel like walking through a museum where every room is a single idea — quiet, warm, confident, with nothing competing for attention.

One word for the entire aesthetic: **elegance.** Not minimalist for minimalism's sake — minimalist because everything unnecessary has been removed and what remains is exactly right. The design equivalent of saying something important in a calm voice.

Reference points: Anthropic's design language, Apple's restraint, Ferrari's editorial chiaroscuro, Tesla's radical subtraction, Vercel's technical precision. None of these literally — Alexandria has its own warmth that none of them have.

**Taste vs intelligence decisions:** This document contains two kinds of constraints. **Taste decisions** (marked with "non-negotiable" or stated as absolutes) come from the founder's constitution and brand ground truth (Alexandria_IV.md) — they do not change with better models. **Intelligence decisions** (marked as "default" or "prefer") are soft defaults — a better model should be able to improve on them while staying within the taste constraints. When in doubt: taste is about WHAT and WHY (values), intelligence is about HOW (methods).

**Downstream of a4:** Brand decisions (logo, palette philosophy, imagery direction, motion philosophy, voice) are grounded in `files/private/Alexandria_IV.md`. This file adds the technical design system — specific values, component specs, type scale, layout patterns. If a4 evolves, this file must update to match.

---

## 2. Color System

Use HSL for manipulation, hex for specification. The palette is warm — Alexandria rejects sterile whites and cool greys. Everything should feel like quality paper, like a room with good light.

### Light Mode

| Role | Value | Usage |
|------|-------|-------|
| Background | `#faf8f5` | Primary canvas — warm cream, not white |
| Surface | `#f3efe9` | Cards, wells, alternate sections |
| Surface deep | `#ebe6de` | Recessed containers, input backgrounds |
| Text primary | `#1a1a1a` | Headings, primary content — warm near-black |
| Text secondary | `#4d4640` | Body text, descriptions |
| Text muted | `#6b6b6b` | Captions, labels, metadata |
| Text subtle | `#8a8078` | De-emphasised content |
| Text ghost | `#b0a89e` | Whisper-level text, placeholders |
| Text whisper | `#ccc6bc` | Barely visible, structural hints |
| Accent | `#c4956a` | Muted gold — sparingly, never dominant |
| Border | `rgba(26, 26, 26, 0.08)` | Shadow-as-border, not CSS border |
| Overlay | `rgba(26, 26, 26, 0.25)` | Modals, overlays |

### Dark Mode

Dark mode is not an afterthought — it is equally considered. Invert the warmth.

| Role | Value | Usage |
|------|-------|-------|
| Background | `#1a1917` | Warm dark — not pure black, not cool grey |
| Surface | `#242320` | Cards, wells |
| Surface deep | `#2e2d29` | Recessed containers |
| Text primary | `#ece8e1` | Headings — warm off-white |
| Text secondary | `#c8c2b8` | Body text |
| Text muted | `#8a8480` | Captions, metadata |
| Text subtle | `#6b6560` | De-emphasised |
| Text ghost | `#4d4944` | Whisper |
| Text whisper | `#3a3835` | Barely visible |
| Accent | `#c4956a` | Same gold, works on dark |
| Border | `rgba(255, 255, 255, 0.06)` | Shadow-as-border |

### Light and Dark Mode

One mode at a time. System preference auto-detection. No mixed light/dark sections on the same page — that overrides the user's preference, which violates pure marginal value add. The user chose their mode. Respect it.

- Light mode: warm cream canvas, dark text
- Dark mode: warm dark canvas, light text
- Theme toggle available but optional — system preference is the default
- Both modes are equally considered. Neither is the "real" version.

### Color Principles

- No more than 3 colors on screen at once (background, text, accent)
- Accent gold appears only on interactive elements or single focal points
- Greys are always warm (brown undertone), never blue or cool
- Text hierarchy through 6+ opacity levels — this is Alexandria's distinctive depth
- Default: no gradients on UI elements. Depth comes from photography and contrast. (Intelligence decision — a gradient that serves content better than flat is not forbidden, just rare.)
- Default: no semantic color coding on marketing pages. Use hierarchy and position instead of red/green/blue.

---

## 3. Typography

Two registers. Serif carries philosophical weight. Sans carries functional clarity. Both track tight.

### Font Stack

| Register | Font | Role | Tracking | Source |
|----------|------|------|----------|--------|
| Display serif | Instrument Serif | Hero text, section headings, pull quotes | -2% (`-0.02em`) | Google Fonts |
| UI sans | Inter variable | Body, navigation, buttons, metadata, labels | -1% to -4% scaled by size | Google Fonts (variable) |
| Monospace | Geist Mono | Code, eyebrow labels, technical metadata | 0% to +5% | Self-hosted / Vercel |
| Logo | Playfair Display | "a." and "alexandria." only | 0% | Google Fonts |

**Why these:** Instrument Serif is modern editorial — serious without being fusty. Inter is the best variable sans available — mid-weights (450, 550) create nuance impossible with standard fonts. Geist Mono for its precision. All free.

**Alternatives in the palette** (for special treatments, not primary use): Sentient (-3%, Fontshare), Saans (Fontshare), Neue Montreal, Signifier (Klim, paid). These expand the range but should not fragment the core identity.

### Type Scale

Generated from a 1.250 (Major Third) scale. All sizes use `rem` with `px` reference. These are soft defaults for consistency — the principle (tracking tightens with size, line-height loosens with smallness, weight stays restrained) matters more than exact values.

| Role | Size | Weight | Tracking | Line Height | Font |
|------|------|--------|----------|-------------|------|
| Display | 3rem (48px) | 400 | -0.03em | 1.1 | Instrument Serif |
| Heading 1 | 2.25rem (36px) | 400 | -0.025em | 1.15 | Instrument Serif |
| Heading 2 | 1.75rem (28px) | 400 | -0.02em | 1.2 | Instrument Serif |
| Heading 3 | 1.25rem (20px) | 500 | -0.015em | 1.3 | Inter |
| Body large | 1.125rem (18px) | 400 | -0.01em | 1.7 | Inter |
| Body | 1rem (16px) | 400 | -0.01em | 1.7 | Inter |
| Body small | 0.875rem (14px) | 400 | -0.005em | 1.6 | Inter |
| Caption | 0.75rem (12px) | 450 | 0em | 1.5 | Inter |
| Eyebrow | 0.6875rem (11px) | 500 | 0.05em | 1.4 | Geist Mono, uppercase |
| Label | 0.875rem (14px) | 500 | -0.005em | 1.4 | Inter |

### Typography Principles

- **Tracking tightens as size increases.** Body text is slightly tight. Display text is aggressively tight. This is the modern editorial signature.
- **Use Inter's variable weights.** 450 for relaxed body, 500 for UI, 550 for emphasis. Don't limit to 400/500/600/700 — the range between is where refinement lives.
- **Serif for philosophy, sans for function.** If the text is about an idea, it's serif. If it's about an action, it's sans.
- **Max reading width: 65ch** (`max-w-[65ch]`). Use `ch` units for text containers — they scale with font size.
- **Line height scales inversely with size.** Large display text: 1.1. Body text: 1.7. Small text can go to 2x for breathing room (Schoger: 14px text at 28px line-height).
- **No text transforms except eyebrow labels.** Alexandria's confidence is expressed through lowercase calm (Tesla principle). Uppercase only for structural annotation (Geist Mono eyebrow labels).
- **Weight restraint.** Default range is 400–600. Boldness is achieved through size and color contrast, not heavy weight. (Intelligence decision — 700 is not forbidden, just rarely needed.)
- **`text-pretty` for headings, `text-balance` for short blocks.** Prevent orphans and improve distribution.
- **Labels are a last resort.** If the content's meaning is clear from context, the label is noise. Remove it.

---

## 4. Layout & Spacing

### Spacing System

Base unit: 4px. Scale by powers and common multiples.

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Hairline gaps, icon padding |
| space-2 | 8px | Tight element spacing |
| space-3 | 12px | Default inline spacing |
| space-4 | 16px | Standard gap |
| space-6 | 24px | Component internal padding |
| space-8 | 32px | Section internal padding |
| space-12 | 48px | Between components |
| space-16 | 64px | Between sections (mobile) |
| space-20 | 80px | Between sections (tablet) |
| space-32 | 128px | Between sections (desktop) |
| space-40 | 160px | Hero vertical padding |

### Layout Principles

- **Start with too much whitespace, then remove.** Never fill space reflexively. Whitespace is a luxury signal (Tesla). Empty space is confidence.
- **One message per screen.** Major sections should occupy near-full viewport height. Gallery pacing — each scroll is a deliberate transition, not a continuous feed.
- **Narrow text column, wide margins.** Text lives in a 640px (or 65ch) column. The margins ARE the design. Like a well-set book page.
- **Max content width: 1200px.** Hero imagery can bleed full-width. Content stays contained.
- **Left-align over center for content.** Center-aligned text is for hero headlines only. Everything else reads left. Split layouts (60/40) are more engaging than centered stacks.
- **Ambiguous spacing is a bug.** The space between any two elements should make their relationship unambiguous. Closer = related. Further = separate. Never equidistant between two groups.
- **Grids are overrated.** Use them for repeated card layouts. For editorial pages, let the content determine the layout. A philosophy page doesn't need a 12-column grid.

### Container Patterns

| Pattern | Max Width | Use |
|---------|-----------|-----|
| Reading | 640px / 65ch | Longform text, partner docs, philosophy |
| Content | 960px | Standard page content, forms |
| Feature | 1200px | Feature sections, card grids |
| Full bleed | 100% | Hero images, dark sections, backgrounds |

---

## 5. Components

### Buttons

Alexandria never uses filled buttons. Non-negotiable taste decision — buttons are invitations, not demands.

| Variant | Background | Text | Border | Radius | Padding |
|---------|-----------|------|--------|--------|---------|
| Primary | transparent | text-primary | 1px ring at 15% opacity | default: pill (9999px) | 12px 24px |
| Primary hover | text-primary at 5% | text-primary | 1px ring at 25% opacity | default: pill (9999px) | 12px 24px |
| Ghost | transparent | text-muted | none | default: pill (9999px) | 8px 16px |
| Ghost hover | text-primary at 3% | text-primary | none | default: pill (9999px) | 8px 16px |

- Height: 36–40px via padding, not explicit height
- Font: Inter 14px, weight 500
- Transitions: `background-color 0.2s, color 0.2s, border-color 0.2s`
- Default: no shadows on buttons. Shadows signal elevation — buttons sit flat on the page.
- When pairing a ring button with a ghost button, compensate for the ring's 2px so they align (Schoger tip)
- On dark sections: invert — ring and text use cream/light colors
- Border-radius is an intelligence decision. Pill (9999px) is the default. 8px or other values may fit specific contexts better.

### Links

- Default: text-muted, no underline
- Hover: text-primary, no underline (or subtle underline-offset-4 at low opacity)
- Inline (within prose): text-secondary with underline-offset-4, subtle underline at 20% opacity
- Never change color to indicate "link" — context should make interactivity clear
- Borderless. Always.

### Cards

- Background: surface color (slight contrast with page background)
- Border: shadow-as-border — `box-shadow: 0 0 0 1px rgba(26,26,26,0.06)` (Vercel technique)
- Radius: 8px standard, 12px featured
- Padding: 24px standard, 32px generous
- No hover lift/scale transforms. Hover changes border opacity to 0.12.
- On dark backgrounds: `box-shadow: 0 0 0 1px rgba(255,255,255,0.06)`

### Inputs

- Background: surface-deep
- Border: shadow-as-border at 6% opacity
- Focus: accent gold ring (`0 0 0 2px #c4956a`)
- Radius: 6px
- Padding: 10px 14px
- Font: Inter 16px (prevents iOS zoom)
- Placeholder: text-ghost

### Navigation

- Sticky, transparent background that gains background-color on scroll
- Logo "a." left-aligned, Playfair Display
- Nav items: Inter 14px, weight 500, text-muted → text-primary on hover
- No visible separator between nav and content
- Mobile: prefer slide-in panel over hamburger dropdown (intelligence decision — context may dictate)
- Default: 3–5 items. More than 5 is a signal the information architecture needs rethinking, not that the nav needs expanding.

### Wells (Recessed Containers)

- Background: `rgba(26,26,26, 0.025)` on light, `rgba(255,255,255, 0.025)` on dark (Schoger tip)
- No border, no shadow
- Radius: 12px
- Bottom padding can be cropped for flush effect with contained elements

### Dividers

When needed (rarely), use centered dots or a thin line:
- Dots: `· · ·` in text-whisper, tracking 0.5em
- Line: 1px, text-whisper at 30% opacity, max-width 80px, centered
- Never full-width horizontal rules

---

## 6. Depth & Elevation

Alexandria is almost flat. Depth comes from content contrast, photography, and the chiaroscuro section rhythm — not from shadows.

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 (Flat) | None | Default for all elements |
| 1 (Ring) | `0 0 0 1px rgba(26,26,26,0.06)` | Cards, containers (shadow-as-border) |
| 2 (Subtle) | Ring + `0 1px 2px rgba(26,26,26,0.04)` | Elevated cards, dropdowns |
| 3 (Overlay) | `0 4px 16px rgba(26,26,26,0.08)` | Modals, popovers |
| Frosted | `backdrop-filter: blur(12px)` + semi-transparent bg | Sticky navigation on scroll |

### Shadow Principles

- **Shadow-as-border replaces CSS borders everywhere.** Traditional borders look harsh. A 1px box-shadow ring at low opacity is more refined (Vercel/Schoger).
- **Outer ring, not inner border.** Use `box-shadow` outside the element, not `border`, to avoid muddy interaction with other shadows (Schoger: gray-950 at 10% opacity).
- **Concentric radius.** When nesting rounded elements, inner radius = outer radius - padding. Harmonious nesting.
- **No decorative shadows.** If an element has a shadow, it's because it's literally floating above other content (modal, dropdown). Marketing cards sit flat.
- **Photography is the depth.** Full-bleed imagery creates all the visual richness the UI needs. Shadows on UI elements next to photographs look redundant.

---

## 7. Motion & Interaction

### Principles

- Things appear. They don't bounce. (From brand guidelines)
- Transitions ease, don't snap.
- Nothing should feel like it's trying to impress. It should feel like it was always there.
- Consistency: use the same duration and easing for all similar interactions.

### Specifications

| Type | Duration | Easing |
|------|----------|--------|
| Color/opacity | 0.2s | ease |
| Transform (appear) | 0.4s | cubic-bezier(0.16, 1, 0.3, 1) |
| Page section fade-in | 0.6s | ease-out |
| Layout shift | 0.3s | ease-in-out |

### Scroll Animations

- Sections fade in with subtle upward translate (12px) as they enter viewport
- Trigger: IntersectionObserver at 10% visibility
- No parallax. No scroll-jacking. Scrolling should feel natural.
- Stagger child elements by 50–100ms for a cascade effect within sections

### Hover States

- Default: color/opacity transitions. Prefer over scale, translate, or rotate — which feel performative. (Intelligence decision — a subtle scale on a card image could work if earned.)
- Links can have subtle underline animation (width expansion)
- Keep hover feedback immediate but gentle

---

## 8. Photography & Imagery

- If used, photographs should feel natural, warm, high quality
- No stock photography aesthetics — nothing posed, nothing generic
- No ai-generated imagery that looks ai-generated
- Better to use no image than a mediocre one
- Photography subjects: natural elements (water, light, fire), architecture (libraries, museums, classical), human details (hands, eyes, materials like paper and ink)
- Treatment: full-bleed for hero, with generous whitespace framing for inline
- Never overlay text on busy imagery without a gradient shim
- Dark sections can use photography as background with overlay for text legibility

### The Eye + Mercury Mind

Alexandria's canonical visual: warm human eye containing a silver-mercury pool inside. Subtle motion — surface ripples, faint ink threads. Photorealistic with slight artistic shimmer. This image is as canonical as the "a." mark. Use as hero, loading state, social anchor.

### Canvas Grid (Optional Polish)

Decorative hairline grid pattern behind sections for refined aesthetic (Stripe-style). Horizontal and vertical lines at very low opacity (2–3%). Adds texture without competing with content. Use selectively, not on every section.

---

## 9. Do's and Don'ts

### Do

- Let whitespace carry meaning — a sentence alone on a page is held breath
- Use the 6-level text hierarchy (primary → whisper) — this is Alexandria's signature depth
- Give each section room to breathe — gallery pacing, one idea per screen
- Use shadow-as-border instead of CSS borders
- Track type tighter as it gets larger
- Use Inter's variable mid-weights (450, 550) for nuance
- Start with too much space, then remove
- Use `ch` units for text container widths
- Test every page in both light and dark mode — both must be equally considered
- Let photography and whitespace create depth, not shadows
- Use pill-shaped (9999px radius) buttons
- Keep navigation to 3–5 items

### Don't — Non-Negotiable (Taste)

- Use filled/solid background buttons — buttons are invitations, not demands
- Use cool greys — all neutrals are warm (brown undertone)
- Use stock photography or generic ai imagery
- Use SaaS layout patterns (hero → 3 features → pricing → testimonials → footer)
- Use emojis. Ever.
- Use text-ghost or text-whisper for essential information (fails WCAG)

### Don't — Strong Defaults (Intelligence)

These are strong preferences, not absolutes. Override only when the specific context demands it and you can articulate why.

- Use gradients, patterns, or decorative backgrounds on UI
- Use more than one accent color
- Apply shadows to flat marketing elements
- Use uppercase text except for structural annotation
- Use font weights above 600
- Use center-aligned body text
- Use traditional CSS borders instead of shadow-as-border
- Add hover animations with scale/translate instead of color transitions
- Fill available space reflexively
- Use bounce, hop, or playful animations

---

## 10. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <640px | Single column, 16px horizontal padding, display at 2rem, section padding 64px |
| Tablet | 640–1024px | Reading column expands, 32px padding, display at 2.5rem, section padding 80px |
| Desktop | 1024–1440px | Full layout, max-width containers, display at 3rem, section padding 128px |
| Large | >1440px | Content centered, generous margins, imagery can scale |

### Touch Targets

- Minimum 44x44px for all interactive elements
- Buttons: min-height 40px with adequate padding
- Nav items: generous padding for thumb reach
- Links in prose: adequate line-height spacing

### Collapsing Strategy

- Navigation: horizontal → slide-in panel (not hamburger dropdown)
- Multi-column layouts: side-by-side → stacked
- Hero text: scales proportionally via clamp()
- Section padding: reduces but stays generous (64px minimum)
- Images: maintain aspect ratio, full-width on mobile
- Chiaroscuro sections: maintain alternation at all sizes

---

## 11. Alexandria's Intentional Breaks

Where Alexandria diverges from standard modern design practice, and why.

| Standard Practice | Alexandria's Break | Why |
|---|---|---|
| Sans-serif for everything | Serif-forward display typography | Philosophical weight. Alexandria is not a tech tool — it's closer to a publication. Serif signals depth and permanence. |
| Cool grey neutrals | Warm brown-undertone neutrals | Warmth. Alexandria should feel like quality paper, a room with good light, a hearth. Not sterile. Not clinical. |
| 3 text hierarchy levels | 6+ levels (primary → whisper) | Extreme hierarchy enables extreme restraint. Most elements can be whisper-quiet, making the few loud ones devastating. |
| Filled CTA buttons | Never filled, always outline/ghost | Invitation, not demand. Alexandria respects the reader's autonomy. The content should pull — the button is just a door. |
| Hero + features + pricing + footer | Gallery rooms, one idea per screen | Each section is a room in a museum. One idea. Full breathing space. Gallery pacing. Not a scrollable feed. |
| Dark mode as afterthought | Both modes equally considered | Neither light nor dark is the "real" version. Both are first-class. System preference respected. |
| Decorative illustrations / icons | Natural elements only | Water, light, fire, wind. No abstract SaaS illustrations. If imagery appears, it's elemental, photographic, or the Eye+Mercury motif. |
| Consistent "brand voice" tone | Two modes — evocation (human) vs density (ai) | Human-facing pages evoke. They change the reader. ai-facing pages (docs, reference) maximise information density. Same brand, two modes. |
| Center-aligned hero sections | Asymmetric / left-aligned layouts | More engaging, more editorial, less generic. Split layouts (60/40) create tension and movement that centered stacks cannot. |
| Aggressive CTAs | Quiet invitations | "try now" not "START FREE TRIAL." Lowercase. Ghost buttons. The thesis should do the selling. If the reader needs to be pushed, the content failed. |

---

## 12. Agent Prompt Guide

### Quick Color Reference (Light)

```
Background:  #faf8f5    Surface:     #f3efe9
Text:        #1a1a1a    Secondary:   #4d4640
Muted:       #6b6b6b    Ghost:       #b0a89e
Accent gold: #c4956a    Border ring: rgba(26,26,26,0.08)
```

### Quick Color Reference (Dark)

```
Background:  #1a1917    Surface:     #242320
Text:        #ece8e1    Secondary:   #c8c2b8
Muted:       #8a8480    Ghost:       #4d4944
Accent gold: #c4956a    Border ring: rgba(255,255,255,0.06)
```

### Font Loading

```html
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:opsz,wght@14..32,400..600&family=Playfair+Display&display=swap" rel="stylesheet">
```

```css
/* Enable OpenType features on Inter (Linear uses these — visible difference to letter shapes) */
body {
  font-feature-settings: "cv01", "ss03";
  /* cv01: alternate a (single-storey), ss03: alternate g */
}
```

Self-host Geist Mono from Vercel's package or use `font-display: swap` fallback.

### Example Component Prompts

- "Create a hero section with warm cream background (#faf8f5), left-aligned Instrument Serif heading at 48px tracking -0.03em, Inter body text at 18px in text-secondary (#4d4640), and a pill-shaped ghost button with 1px ring border at 15% opacity"

- "Build a dark chiaroscuro section (#1a1917 background) with cream text (#ece8e1), Instrument Serif heading, generous 128px vertical padding, and a canvas grid pattern at 2% opacity behind the content"

- "Design a card with #f3efe9 background, shadow-as-border (box-shadow: 0 0 0 1px rgba(26,26,26,0.06)), 8px radius, 24px padding, Inter text, with heading in weight 550 and body in weight 400"

- "Create sticky navigation with transparent background, Playfair Display 'a.' logo left, 3 Inter nav items center-right at 14px weight 500 in text-muted, gaining backdrop-blur(12px) and semi-transparent cream background on scroll"

### Iteration Guide

When refining:
1. Focus on one component at a time — minimal systems demand pixel-perfect execution
2. Reference the 6-level text hierarchy — most refinement comes from choosing the right level for each element
3. Check both light and dark mode for every change
4. If something feels "designed," it's too much — subtract until it feels inevitable
5. The question is never "what can I add?" but "what can I remove?"
6. If the reader/viewer walks away unchanged, the design failed

---

## 13. Accessibility (Threshold Game)

Accessibility is a threshold game — must be at the bar, no more. Not a maximisation game.

- **Focus states:** Every interactive element must have a visible focus ring. Default: `0 0 0 2px #c4956a` (accent gold). Must be visible on both light and dark backgrounds.
- **Keyboard navigation:** All interactive elements reachable via Tab. Logical tab order. No keyboard traps.
- **Skip links:** Hidden "skip to content" link visible on focus, before navigation.
- **Color contrast (verified 2026-04-06):**
  - PASS AA body (4.5:1+): text-primary (16.4:1), text-secondary (8.7:1), text-muted (5.0:1)
  - PASS AA large only (3:1+): text-subtle (3.6:1 light, 3.1:1 dark) — use only for large text (18px+) or decorative
  - FAIL AA: text-ghost (2.2:1), text-whisper (1.6:1), accent gold (2.5:1) — decorative/structural only, never for essential information or interactive labels
  - Accent gold (#c4956a) fails contrast on both light and dark. Use only as ring/border color or paired with sufficient text. Never as text color for readable content.
- **ARIA:** Semantic HTML first. ARIA only when HTML semantics are insufficient. Modals trap focus and restore on close.
- **Motion:** Respect `prefers-reduced-motion`. Disable scroll animations and transitions for users who request it.
- **Font sizing:** Never use px for body text that users might need to scale. rem throughout. Min 16px for body (also prevents iOS zoom on input focus).

---

## Appendix A: Foundations — Design Principles That Got Us to 8/10

*Raw source material from the design resources that form the foundations. A future model should be able to read these and understand WHY the system above is shaped the way it is. These are the rules we learned before we could break them.*

### A1. Refactoring UI — Core Principles (Wathan & Schoger)

The book that teaches "design with tactics, not talent." Specific, actionable techniques.

**Hierarchy is Everything:**
- Not all elements require equal visual weight
- Size alone doesn't establish hierarchy — use weight, color, spacing together
- De-emphasize secondary elements to emphasize important ones (subtractive emphasis)
- Labels are a last resort — if context makes meaning clear, the label is noise
- Visual hierarchy should separate from document hierarchy (an h2 can be visually quieter than body text if the design demands it)
- Semantics are secondary to design effectiveness

**Layout and Spacing:**
- Start with too much white space, then reduce — never the reverse
- Establish a consistent spacing and sizing system (constrained choices > ad hoc values)
- Don't feel obligated to fill entire screen space
- Grids are overrated for many applications — let content drive layout
- Relative sizing doesn't scale consistently — don't use em for everything
- Avoid ambiguous spacing between elements — proximity signals relationship

**Text Design:**
- Establish a type scale upfront — don't pick sizes ad hoc
- Use quality fonts appropriate to context
- Maintain appropriate line length for readability (~45-75 characters)
- Line-height should scale proportionally (tight for large, loose for small)
- Not every hyperlink needs color differentiation
- Use letter-spacing strategically — tighter for large, wider for small caps

**Color:**
- Use HSL instead of hex for manipulation (saturation and lightness are intuitive)
- You need more colors than you think — define shade variations upfront (50-900 scale)
- Don't reduce saturation when lightening colors — rotate hue toward brighter instead
- Greys don't have to be grey — tint them warm or cool for personality
- Accessible design doesn't require ugly design
- Don't rely solely on color for differentiation — use icons, weight, position too

**Depth:**
- Emulate a consistent light source (top-left is standard)
- Use shadows to convey actual elevation, not decoration
- Shadows can consist of two parts: a larger soft ambient + a tighter directional shadow
- Flat designs can still incorporate depth through background color stepping

**Borders:**
- Use fewer borders — they make designs feel busy and cluttered
- Alternatives: box shadow, contrasting background colors, or simply more space between elements
- When you must use a border, make it subtle — low opacity, not solid grey

### A2. Steve Schoger — 18 Design Tips from "Designing with Claude Code"

Schoger's workflow: Vite + Tailwind + React + Claude Code. No Figma. ~50 iterative conversations to go from AI output to professional quality.

**Borders & Shadows:**
1. **Outer ring instead of solid border** — Use `box-shadow: 0 0 0 1px` with gray-950 at 10% opacity outside elements. Avoids the "muddy" effect when shadow and border interact. This is the Vercel technique.
2. **Concentric radius** — Inner border-radius = outer radius minus padding. Creates harmonious nested roundness instead of arbitrary mismatch.
3. **Inset ring for edge definition** — Replace traditional borders with `box-shadow: inset 0 0 0 1px` at 5% opacity on light backgrounds. Barely visible but structurally defining.

**Typography:**
4. **Inter variable font from rsms.me** — Download the variable version directly for access to mid-range weights (e.g., 550) unavailable in standard versions. The half-steps between weights is where refinement lives.
5. **Tighter tracking for large type** — Anything 24px+ needs reduced letter-spacing for visual impact. The larger the text, the tighter the tracking.
6. **Monospace eyebrow text** — Use Geist Mono, uppercase, wider tracking (+5%), extra-small size (11px), gray-600 for section labels. Creates structural annotation above headings.
7. **`text-pretty` vs `text-balance`** — `text-pretty` prevents orphaned words in multi-line text. `text-balance` distributes text evenly across lines. Choose based on context.
8. **Double line-height for small text** — 14px text at 28px line-height creates breathing room. The ratio can go higher for small sizes than you'd expect.

**Layout:**
9. **Left-align over center** — Split headline layout (3/5 left, 2/5 right description) is more engaging than centered stacks. Creates visual tension and editorial feel.
10. **Inline section heading** — Title and subtitle on the same line with different colors/weights. Saves vertical space, creates sophisticated typography.
11. **Max-width in `ch` units** — Use `max-w-[40ch]` or `max-w-[65ch]` for readable text blocks. Character-based units scale with font size and maintain reading comfort regardless of container.

**Elements:**
12. **Button height and shape** — 36-38px via padding (not explicit height), pill-shaped (full border-radius), 14px text. Height from padding is more flexible and responsive.
13. **Ring height compensation** — When pairing a button with a ring/border and one without, the ring adds ~2px to total height. Compensate so they visually align.
14. **Well-styled containers** — Subtle background (`gray-950` at 2.5-5% opacity), remove borders entirely, crop bottom padding for flush effect with contained elements. Wells should be barely there.
15. **Screenshots as hero visuals** — Use 3x resolution app screenshots for immediate visual focus. Real product shots > abstract illustrations.

**Decoration & Details:**
16. **Canvas grid** — Decorative horizontal and vertical hairlines between sections. Very low opacity (2–3%). Stripe uses this. Adds refined texture without competing with content. Use selectively.
17. **Background image testimonials** — Portrait images as card backgrounds with gradient shim (dark → transparent) for text legibility. Creates visual richness with minimal effort.
18. **Minimal logo clouds** — Display partner logos without titles, using real SVGs. Cleaner than logo + text combinations.

### A3. Design System Extracts — What We Took From Each

**Tesla — Radical Subtraction:**
- Full-viewport hero sections (100vh) — one message per screen
- Single accent color (Electric Blue #3E6AE1) — everything else is monochrome
- Near-zero decoration: no shadows, no gradients, no borders, no patterns
- Photography carries ALL emotional weight — "if the UI itself feels 'designed,' it's too much"
- Weight restraint: only 400 and 500 used across entire site
- 4px border-radius for interactive elements — precision over playfulness
- 0.33s transitions on everything — consistency in motion = consistency in feel
- Whitespace as luxury signal — generous spacing means you can only see one "message" at a time
- No uppercase text transforms — confidence expressed through lowercase calm
- Gallery-like browsing where each scroll is deliberate transition
- Color transitions only on hover — no scale, translate, or rotate

**Ferrari — Editorial Chiaroscuro:**
- Alternating black/white sections as page-turn metaphor
- Ferrari Red as surgical accent — singular, non-negotiable, used with extreme restraint
- Two-register typography: FerrariSans (narrative) + Body-Font (uppercase structural annotation)
- Shadows nearly eliminated — depth from surface contrast and photographic quality only
- 40-80px section padding on desktop — gallery breathing room
- Four font weights max, minimal color token set, zero gratuitous decoration
- Authority derives from restraint, not richness
- Print magazine conventions applied to web

**Vercel — Technical Precision:**
- **Shadow-as-border**: `box-shadow: 0px 0px 0px 1px rgba(0,0,0,0.08)` replaces CSS borders everywhere
- Multi-layer shadow stacks: border ring + subtle elevation + ambient depth + inner highlight
- Geist font with aggressive negative letter-spacing (-2.4px to -2.88px at display)
- Three-weight system: 400 (body), 500 (UI), 600 (headings only)
- Achromatic UI chrome — workflow colors used contextually, never decoratively
- `#171717` not pure black for warmth (warm near-black)
- OpenType ligatures enabled globally on Geist
- Gallery emptiness: 80-120px+ vertical section padding

**Linear — Dark-Mode Native:**
- `#08090a` primary background — "darkness as the native medium"
- Information density managed through subtle gradations of white opacity, not color variation
- Inter Variable with `"cv01"` and `"ss03"` OpenType features enabled globally
- Signature weight 510 — positioned between regular 400 and medium 500
- Aggressive negative letter-spacing at display sizes (-1.584px at 72px)
- Berkeley Mono as monospace companion
- Single chromatic accent (brand indigo #5e6ad2) reserved exclusively for CTAs
- Semi-transparent white borders: `rgba(255,255,255,0.05)` to `rgba(255,255,255,0.08)`
- Elevation through background luminance stepping, not traditional shadows
- 80px+ section padding, no visible dividers

**Stripe — Elegant Weight:**
- Extraordinarily light headline weight: 300 — creates airy, confident feel
- Custom `sohne-var` variable font with OpenType `"ss01"` enabled globally
- Blue-tinted multi-layer shadows using `rgba(50,50,93,0.25)` + `rgba(0,0,0,0.1)`
- Stripe Purple (#533afd) as brand anchor + interactive accent
- Conservative border-radius: 4-8px (not pill)
- Max width ~1080px for content
- Measured, purposeful whitespace

**Apple — Premium Restraint:**
- SF Pro as unified type family (Display + Text optical variants)
- Binary color strategy: black text on white, white text on black
- Premium whitespace — wide margins, generous breathing room
- Cinematic imagery carries emotional weight
- Things appear, they don't bounce — subtle, purposeful motion
- 0.3s standard transition duration

### A4. The Taste Thread — Avid on Building Taste with AI (2026)

Core thesis: AI commoditised execution. 75% and below is now slop. The delta above 75% is where taste lives — and it's more valuable than ever.

**Key insights that shaped our thinking:**

- **Statistical taste** = what AI produces by default. The safest, most optimal version of "good." Purple-to-blue gradients, bold claim + three bullets, polite corporate voice. AI didn't kill taste — it made the average way more accessible.
- **The gap** = the space between what AI generates and what you actually want. Most people avoid it. People with taste learn to name it. That gap IS your taste.
- **Generate, then destroy** = produce 10-20 versions, don't pick the best — develop a rejection vocabulary. "This fails because X." X must be structural, not cosmetic. Do it enough and you've internalised a framework you couldn't have articulated before.
- **Specificity test** = "Could this have been written about anything else?" If you could swap the subject and nothing changes, it has no taste. Taste is irreducibly contextual.
- **Resistance as signal** = when AI output bothers you and you can't articulate why, don't move on. Sit with the friction. That is raw material. Cumulative moments build an aesthetic immune system.
- **Taste vs better-than-human taste** = AI will eventually have better taste than most humans at most things. What it cannot replace is taste with a perspective. Rick Rubin doesn't just know what sounds good — he knows what sounds good given what he believes music is for. That belief comes from living, choosing, losing. Not from a dataset.
- **Curiosity, Judgment, Standards** = the taste triad. Curiosity interrogates what inspiration is (not passive admiration). Judgment is selection AND rejection simultaneously. Standards are lines you won't cross. If you don't have standards, AI supplies them — and AI standards are culturally averaged aesthetics.
- **The 75-25 rule** = AI gets you to 75%. Everything above that is human curation. The world labels in extremes now: below 75% = slop, above = masterpiece.

**How this maps to Alexandria:** The thesis IS this argument applied to the self. AI produces statistical cognition — the averaged, safe-good version of self-knowledge. The gap between statistical self-knowledge and YOUR self-knowledge is where the constitution lives. Alexandria is the infrastructure for naming that gap precisely.

### A5. Five Core Web Design Skills (Self Made Web Designer)

The five skills that actually matter, in priority order:

1. **Typography** — "quietly makes or breaks a website." Most of the web is text. Master font pairing, type scale, hierarchy, spacing, and readability before anything else.
2. **Layout** — Clean lines, intentional alignment, clear visual path. Combine grid, whitespace, and content flow to guide the eye naturally.
3. **Color** — "Pro designers don't use more color — they use color more intentionally." 2-3 core colors, each with a specific job. Every color earns its place.
4. **Code** — Enough to be dangerous. Understanding what's possible and what's cheap vs expensive enables better design decisions.
5. **Conversion** — Every page has an objective. Design serves that objective. If the most beautiful page doesn't convert, it failed at its job.

### A6. Font Palette — Full Specifications

| Font | Type | Tracking | Weight Range | Source | License | Notes |
|------|------|----------|-------------|--------|---------|-------|
| Geist | Variable sans | -4% at display | 100-900 | vercel.com/font | OFL | Vercel's house font. Aggressive tracking. Ligatures. |
| Sentient | Serif | -3% at display | 300-700 | fontshare.com | ITF Free License | Old style forms + modern function. Immersive reading. Indian Type Foundry. |
| Instrument Serif | Serif | -2% at display | 400 (regular only) | Google Fonts | OFL | Modern editorial. Italic available. Single weight keeps it honest. |
| Inter | Variable sans | -4% at display | 100-900 | rsms.me/inter or Google Fonts | OFL | Mid-weights (450, 550). OpenType features `cv01`, `ss03`. |
| Neue Montreal | Sans | -3% at display | 300-700 | pangram.co | Paid | Neo-grotesk. Neutral but distinctive. |
| Saans | Sans | — | 100-900 | fontshare.com | ITF Free License | Geometric. Clean. Good for UI. |
| Signifier | Serif | — | 200-800 | klim.co.nz | Paid | Klim Type Foundry. Premium editorial serif. Designed for screens. |
| Playfair Display | Serif | 0% | 400-900 | Google Fonts | OFL | Logo only ("a." and "alexandria."). Non-negotiable. |
| EB Garamond | Serif | — | 400-800 | Google Fonts | OFL | Current body serif. Heritage. Excellent for long-form reading. |
| Geist Mono | Monospace | 0% to +5% | 100-900 | vercel.com/font | OFL | Eyebrow labels, code, technical metadata. |

**Download sources:**
- Google Fonts: fonts.google.com (Instrument Serif, Inter, Playfair Display, EB Garamond)
- Fontshare: fontshare.com (Sentient, Saans) — Indian Type Foundry, free for commercial use
- uncut.wtf — Free typeface catalogue, 163 contemporary typefaces, independent designers
- Klim Type Foundry: klim.co.nz (Signifier) — paid, premium
- Pangram Pangram: pangram.co (Neue Montreal) — paid

**Typography tools:**
- typescale.net — mathematical typography scale generator, exports CSS/SCSS/JSON
- Use Major Third (1.250) or Perfect Fourth (1.333) ratio as starting point

### A7. Reference Design Systems — Where to Find Full Specs

All from github.com/VoltAgent/awesome-design-md — 58 DESIGN.md files capturing design systems from public websites. Each includes visual theme, color palette, typography, components, layout, depth, do's/don'ts, responsive behavior, and agent prompt guide.

**Most relevant to Alexandria's aesthetic:**
- `/design-md/tesla/` — radical subtraction, one accent, photography IS design
- `/design-md/ferrari/` — chiaroscuro, editorial, authority from restraint
- `/design-md/vercel/` — shadow-as-border, Geist, achromatic precision
- `/design-md/linear.app/` — dark-mode native, opacity hierarchy, Inter
- `/design-md/stripe/` — weight 300 elegance, blue-tinted shadows, canvas grid
- `/design-md/apple/` — premium restraint, SF Pro, cinematic imagery

**Adjacent references worth studying:**
- `/design-md/claude/` — warm terracotta accent, clean editorial (Anthropic)
- `/design-md/spacex/` — stark black and white, full-bleed, futuristic
- `/design-md/superhuman/` — premium dark, keyboard-first, purple glow
- `/design-md/notion/` — warm minimalism, serif headings, soft surfaces
- `/design-md/resend/` — minimal dark, monospace accents

### A8. UI Tools & Resources

- **ui.sh** — Toolkit by Wathan & Schoger (Tailwind CSS / Refactoring UI creators) for coding agents. Turns terminal into design engineer. Skills package for Claude Code, Cursor, Amp, Codex. Currently invite-only (founder on waitlist).
- **Refactoring UI** — Book + component gallery + video tutorials. 218 pages, 50 visual chapters. "Design with tactics, not talent." refactoringui.com
- **unsplash.com** — Free high-resolution photography. For hero imagery, editorial sections. Natural, warm, high quality. No stock feel.
- **typescale.net** — Mathematical typography scale generator. Exports CSS/SCSS/JSON. Use for building the type hierarchy.
- **fontshare.com** — Indian Type Foundry free font library. ~100 families, higher average quality than Google Fonts. Sentient and Saans live here.
- **uncut.wtf** — Free typeface catalogue. 163 contemporary typefaces (66 sans, 27 serif, 23 mono, 47 display). Independent designers, commercial-use free.
