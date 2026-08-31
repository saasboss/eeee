# Menu polish: headers, Kiosk grid, promo strip, and easier navigation

## 1. Category header borders and alignment

The centred category headers (Kiosk, Noir, Gazette, Aria) sit on a flex row that mixes the title, the item count and — when a category is promoted — a kicker and a frame. The header box gets no fixed height, so its rule/border lands at a different place per category and can touch the card borders below.

- Give every centred header a strict, shared vertical rhythm: fixed header block height, consistent inset, and a guaranteed gap before the first card so no two border lines ever meet.
- Centre the kicker, title and count as one stacked, centred unit (Kiosk, Aria, Noir).
- Make the header rule/frame width follow the content column exactly instead of bleeding to the edge.

## 2. "Featured tonight / Desserts" featured block

The featured category block (tinted panel + kicker + title) currently looks unbalanced in the public menu, in the promotion preview inside `/menu`, and in the promote sheet — three places rendering the same markup.

- Redesign it once as a centred, tinted panel with the kicker as a small pill above the title, proper internal padding, and its inner ring aligned to the panel radius.
- Apply the same markup/styles to all three surfaces so the preview and the live menu always match.

## 3. Offer strip white gap

The offer strip (`Offer includes · Today only · 2 plates minimum / 1,250 → 950 Lek`) uses a negative margin and its own radius, which leaves a hairline of card background between the strip's cream fill and the card border.

- Make the strip fill the card edge-to-edge: inherit the card's bottom radius exactly, no sub-pixel gap, correct in Kiosk (where the card is a column) and the row templates alike.

## 4. Kiosk overflow → paged horizontal scroll

Kiosk tiles overflow past the screen. Per your answer: each category becomes a horizontally scrolling, snapping pager showing exactly 2 tiles at a time, with the next pair sliding in.

- 2-up snap pager per category, tiles sized to fit the phone width with no right-side overflow.
- Page dots under each row so it's obvious the row scrolls; dots track the active pair.
- Promoted/full-width cards stay full width and out of the pager.

## 5. Spotlight popup smoothness

The spotlight ("Chef's Pick / Truffle Burger / View on menu / Maybe later") pops in abruptly and reflows while the image loads.

- Reserve the image space up front and fade the image in, so the card doesn't jump.
- Replace the hard pop with a soft scale + fade on the card and a separate fade on the backdrop, with a reduced-motion fallback.

## 6. Restaurant name placement

"Sofra" reads as loose text. Tighten it to the profile image: logo and name on one baseline-aligned row, name nudged right next to the logo, status/meta line directly beneath it, and the header actions pinned to the right — same across all header styles.

## 7. Easier access: template + promotions under Menu

You asked for the least friction for a newly landed admin. Plan: make **Menu** the single workspace with three clear tabs.

```text
/menu   [ Items ]   [ Design ]   [ Promotions ]
```

- **Items** — today's menu editing, unchanged.
- **Design** — the template picker (Aria, Gazette, Noir, Market, Kiosk) plus colour/background, moved out of Settings › Appearance.
- **Promotions** — dish promotions, category takeovers and the spotlight popup, all in one list with a single "New promotion" button.

Settings › Appearance and the old Promote tab stay reachable but redirect into the matching Menu tab, so no link or QR anywhere breaks. Each tab shows a live preview of the public menu so changes can be checked without leaving the screen.

## 8. Keep everything in sync

Every change above is made once at the shared render/style level, so the admin editor, the in-app preview, the promotion preview and the public `/menu/:slug` page all show the same thing.

## Technical notes

- All work in `public/hap/app.js` and `public/hap/styles.css`; TanStack routes stay thin shells, with `/admin/settings/appearance` and `/admin/promote` resolving to the new Menu tabs via the existing legacy-screen map in `src/lib/hap-routes.ts`.
- Kiosk pager: CSS scroll-snap with `scroll-snap-align` on tile pairs, dots driven by a scroll listener; no new dependency.
- Also fixing a live crash: the sticky-header handler reads `.prototype-bar` unconditionally and throws `Cannot read properties of null (reading 'getBoundingClientRect')` on the public menu.
- Verification: headless browser pass over all five templates in the admin preview and at `/menu/sofra` — no console errors, no horizontal overflow at 320/390/430px, offer strip flush to the border, header rules never colliding.
