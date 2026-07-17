# Warm Editorial Bento — Design System

> A content-agnostic visual language. It defines colors, typography, spacing, radii, borders, components, and interaction rules only. It never dictates what a page says, how many pages exist, or what any section is "about". Apply it as a pure restyle.

---

## 1. Visual stance

A **warm editorial bento** system built on:

- a cream outer canvas with a white framed inner surface;
- high-contrast serif display type for headline moments;
- a restrained grotesque sans for everything functional;
- compact, asymmetrical cards with a consistent dark hairline outline;
- selective orange graphic details and lemon-yellow actions;
- no shadows, no gradients on UI, no glass, no glow.

### Principles

1. **Warm, not corporate.** Cream, tan, off-white, charcoal — never cold gray or SaaS blue.
2. **Hairline depth.** Depth comes from crisp 1–1.5px charcoal borders, overlap, and color blocking. Never from elevation.
3. **Editorial contrast.** One decisive serif per region; sans stays quiet and compact.
4. **Pill + outline.** Controls, badges, and compact chrome round to full pills with dark borders.
5. **Accent restraint.** Orange is a small graphic signal. Yellow is reserved for actions and rewards.
6. **Asymmetric bento.** Grids are intentionally uneven, tightly aligned, and responsive.

---

## 2. Color

### Tokens

| Token | Value | Role |
| --- | --- | --- |
| `canvas` | `#E7DFD0` | Outer page background around the framed surface. |
| `surface` | `#FFFFFF` | Framed inner surface and primary cards. |
| `tan-soft` | `#E9E1D2` | Secondary surfaces, chrome containers, quiet cards. |
| `tan` | `#DDD3C0` | Feature cards, information panels, tonal blocks. |
| `charcoal` | `#171512` | Text, all hairline borders, dark fills, ink details. |
| `ink-muted` | `#6F6A61` | Body copy, descriptors, supporting metadata. |
| `orange` | `#E35E2B` | Diamond marks, image backdrops, small graphic accents. |
| `yellow` | `#EEEB86` | Primary actions, end-caps, small utility circles, special labels. |

### Rules

- Every visible card and control uses **charcoal** as its border, at **1–1.5px**.
- Orange never becomes a large flat page background — it is a mark or an image field.
- Yellow stays high-value: primary actions, notable badges, small utility controls.
- No gradients on UI surfaces. Subtle grayscale gradients are only acceptable inside abstract illustrations or generated artwork.
- No drop shadows anywhere. No box glows, no colored shadows.

---

## 3. Typography

### Families

| Role | Family | Use |
| --- | --- | --- |
| Display | `DM Serif Display` | Headings, large numerals, quotations. |
| UI / body | `DM Sans` | Navigation, buttons, labels, forms, descriptions, tags, meta. |

### Rules

- Display leading: `0.94–1.0`. Editorial and close.
- Display tracking: `-0.025em` to `-0.03em`. Slightly tight, never aggressive.
- UI text: `DM Sans` medium/semibold for controls and labels; regular for body.
- Body: compact `12–13px`, line-height `1.4–1.5`.
- Eyebrows: `11–12px`, uppercase, letter-spacing `~0.14em`, semibold.

### Scale

| Element | Size | Family |
| --- | --- | --- |
| Hero heading | `clamp(46px, 6vw, 62px)` | Display |
| Section heading | `clamp(36px, 4.5vw, 54px)` | Display |
| Card title | `28–35px` | Display |
| Large numeral / stat | `34–42px` | Display |
| Navigation / CTA | `12–13px` | Sans medium/bold |
| Body | `12–13px` | Sans regular |
| Meta / caption | `10–12px` | Sans |

---

## 4. Space, sizing, radii, borders

### Border

- Standard hairline: `1.25px solid #171512`.
- Same color and weight across cards, pills, dividers, inputs. Never mix border colors on UI.

### Radius

| Surface | Radius |
| --- | --- |
| Outer framed site surface (desktop) | `38px` |
| Outer framed site surface (mobile) | `28px` |
| Standard card | `22px` |
| Small card / inset block | `16–18px` |
| Pill / button / badge / chip | `999px` (full) |
| Circular control (avatars, icon buttons, end-caps) | `50%` |

### Spacing scale

Use a `4px` base. Common steps: `4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64`.

- Card interior padding: `20–28px`.
- Compact card padding: `14–18px`.
- Section vertical rhythm: `48–96px` between major regions.
- Grid gaps between bento units: `16px` desktop, `12px` mobile.

### Container

- Max content width: `1110px`.
- Outer canvas padding: `clamp(16px, 3vw, 32px)`.
- Inner framed surface padding: `clamp(20px, 4vw, 40px)`.

### Sizing conventions

- Buttons/pills: height `36–44px`, horizontal padding `16–24px`, gap to icon `8–10px`.
- Icon buttons / end-caps: `28–36px` circle.
- Avatars: `28–40px` circle with `1.25px` charcoal outline; overlap `-8px` when stacked.
- Inputs: full-width, only a `1.25px` charcoal bottom border, `12–14px` vertical padding, no fill.
- Dividers: `1.25px` charcoal horizontal rule, full container width.

---

## 5. Layout

### Framing

- The site always sits on the **cream canvas**.
- Content lives on a **white framed inner surface** with large rounded corners (`38px` desktop, `28px` mobile).
- The frame is inset from the canvas on all sides — the cream always shows around it.

### Bento grid

- Asymmetric multi-column composition (commonly 3 columns) with cards of varied width and height.
- Column archetypes: narrow (~230px), narrow (~230px), wide flexible.
- Gap: `16px`. Cards share alignment lines but not identical dimensions.
- On tablet: collapse to 2 columns. On mobile: single column, preserving order and borders.

### Rhythm

- Alternate white and tan-toned cards for tonal contrast.
- Group related cards with shared vertical or horizontal edges.
- Never fill an entire row with identical cards — introduce a size or tone variation.

---

## 6. Components (primitives)

### Card

- Fill: `surface` / `tan-soft` / `tan` / `charcoal` (inverted).
- Border: `1.25px` charcoal. Radius: `22px`. No shadow.
- Padding: `20–28px`. Inversions use white text and orange or yellow accents.

### Pill / button

| Variant | Fill | Border | Label | End-cap |
| --- | --- | --- | --- | --- |
| Primary | Charcoal | Charcoal | White | Yellow circle |
| Secondary | Tan-soft | Charcoal | Charcoal | Dark circle |
| Accent | Yellow | Charcoal | Charcoal | — |
| Ghost / filter | Transparent / white | Charcoal | Charcoal | — |
| Selected filter | Charcoal | Charcoal | White | — |

- All pills are fully rounded (`999px`).
- Hover: subtle `translateY(-1px)` or arrow nudge only. No shadow, no color wash.

### Chip / tag

- Small pill, `11–12px` sans, transparent or white fill, charcoal border.

### Icon button

- Circle, `32–36px`, yellow or tan-soft fill, charcoal border, single glyph or arrow.

### Diamond mark

- A `10–14px` square rotated 45°, orange fill, charcoal outline.
- Used as an eyebrow marker, rating unit, or card ornament. Replaces stars.

### Avatar

- Circle, charcoal outline, editorial cropping. Stacks overlap `-8px`.

### Portrait treatment (when photography is used)

- Circular crop, dark outline, orange backdrop, elevated contrast/saturation.
- Never a raw rectangular photo dropped into a card.

### Divider

- `1.25px` charcoal horizontal line, full width of its container.

### Input / form field

- No fill, only a `1.25px` charcoal bottom border.
- Label above in small sans bold. Placeholder in `ink-muted`.
- Focus: border thickens or ring uses the shared ring color; no glow.

### Accordion row

- Full-width row split by charcoal dividers.
- Trigger uses display serif; a yellow circular `+`/`×` sits at the right.

### Ticket-style card (structural pattern, not content-specific)

- Tan card containing a title block, a small yellow badge, a paired numeric row, and a charcoal barcode strip along one edge. Internal splits use the standard hairline.

---

## 7. Motion & interaction

- Transitions: `150–220ms`, `ease-out`.
- Hover: translate up to `2px`, shift an inline arrow, or invert a pill's fill — never scale dramatically, never shadow.
- Focus: visible ring using a single shared ring color; never remove focus outlines.
- State changes (selected, sent, expanded) are shown by fill/inversion, not by color hue shifts alone.
- No parallax, no scroll-jacking. Reveal-on-scroll is optional and subtle (`opacity` + `4–8px` translate).

---

## 8. Accessibility

- Every non-decorative image needs alt text.
- Contrast: charcoal on cream/tan/white passes AA at body sizes; muted ink is used only for supporting text at `12px+`.
- All interactive elements are keyboard-operable with a visible focus ring.
- Do not rely on color alone: borders, labels, and iconography always accompany state.

---

## 9. Do / do not

### Do

- Use asymmetry, hairline borders, and bento composition.
- Treat yellow as an interaction reward; treat orange as a graphic note.
- Keep one decisive serif headline per region.
- Preserve the cream → white framing at every breakpoint.

### Do not

- Add gradients on UI surfaces, drop shadows, glassmorphism, or blue accents.
- Replace the orange diamond with stars or generic icons.
- Ship unoutlined floating cards.
- Use square-cornered buttons where a pill belongs.
- Modify the source content of the site this system is applied to — restyle only.
