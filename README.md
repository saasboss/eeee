# v55

This is a TanStack Start (TanStack Router + React 19 + Vite + Tailwind v4 + shadcn/ui) project for **Hap** — a digital restaurant menu SaaS prototype. Here is an exact description of what exists and what the current state is. Do NOT regenerate or overwrite existing code unless I ask.

---

## Tech stack
- TanStack Start (file-based routing via `src/routes/`)
- React 19, TypeScript, Vite
- Tailwind CSS v4 with `@theme inline` design tokens (oklch color system)
- shadcn/ui components (all installed in `src/components/ui/`)
- `vaul` for mobile bottom drawers
- `@lovable.dev/vite-tanstack-config` as the Vite config wrapper
- Template: `tanstack_start_ts_current`

## Brand / design system
- Custom `--brand` color: `oklch(0.62 0.19 45)` (warm amber/orange) in light mode, `oklch(0.7 0.16 45)` in dark
- `--brand-foreground` and `--brand-subtle` tokens defined in `src/styles.css`
- Full dark mode support via `.dark` class toggled on `<html>`
- All colors in oklch; radius base is `0.625rem`

## Routes (3 files in `src/routes/`)

### 1. `/` → `src/routes/index.tsx`
Renders a full-screen `<iframe src="/hap/index.html">` — this serves the static HTML/JS prototype that lives in `public/hap/`. The iframe is the landing experience; it is intentional.

### 2. `/menu/$slug` → `src/routes/menu.$slug.tsx`
The fully implemented **guest-facing digital menu** page. Contains everything in one large file:
- `MenuPage` component (main orchestrator)
- `Header` — hero gradient banner, restaurant name ("Sofra"), dark mode toggle, large text toggle, language switcher (EN/SQ/FR/DE/IT)
- `MenuTypeTabs` — horizontal scroll tabs: Breakfast / Lunch / Dinner / All Day / Drinks
- `CategoryTabs` — sub-categories per menu type (e.g. Starters / Mains / Desserts)
- Search bar (full-width pill input with Search icon)
- `DietaryFilterChips` — All / Vegan / Vegetarian / Gluten-free / Halal / Alcohol-free
- `ItemCard` — card with 80×80 image placeholder, name, price (€), description, energy/spice/portion indicators, allergen bubbles, dietary tags, sold-out and "New" badge states
- `IndicatorRow` — 🔥 energy (1–3, Light/Satisfying/Hearty), 🌶️ spice (0–3), dot + S/M/L portion
- `ItemDetail` — vaul bottom drawer on mobile, centered modal on desktop, with copy-link + WhatsApp share
- `AllergenLegend` — drawer with G/D/N/E/S/F/C/M allergen key
- `GuestActionBar` — fixed bottom bar with Call / Directions / WhatsApp / Wi-Fi / Review
- `Footer` — "Powered by Hap"
- `CookieBanner` — Accept/Decline
- `ClosedOverlay` — full-screen "we're closed" overlay (dismissible)
- All state persisted to `localStorage` (dark mode, language, menu type, category, large text, cookies)

Mock data (16 items): Albanian restaurant dishes — Byrek, Flija, Petulla, Tave Kosi, Qofte (Chef's Pick / promoted), Baklava, Fergese, Suxhuk (sold out), Trilece, Stuffed Vine Leaves, Shopska Salad, Patate te Ferguara, Albanian Espresso, Raki, Ayran, Tirana Sour (New)

### 3. `/admin` → `src/routes/admin.tsx`
The **admin shell layout** only — no sub-page content yet. Contains:
- Desktop sidebar (fixed left, 240px) with logo area ("S" avatar, "Sofra / Restaurant") and nav links
- Nav items: Dashboard / Menu / Promotions / QR Codes / Analytics / Settings / Billing
- Sticky top header with current page title + "View as guest" link → `/menu/sofra`
- Mobile bottom tab bar (5 tabs: Dashboard / Menu / Promos / QR / More)
- Active state styling using `border-brand` + `bg-brand-subtle`
- Sub-routes (`/admin/menu`, `/admin/promotions`, `/admin/qr`, `/admin/analytics`, `/admin/settings`, `/admin/billing`) exist in the router tree but have **no page components yet** — they render an empty `<Outlet />`

## Static prototype (`public/hap/`)
A separate vanilla JS/CSS prototype at `public/hap/index.html` with real food images (webp assets: burrata-tomato, grilled-octopus, caesar-salad, margherita, tiramisu, house-salad, pistachio-cheesecake, sea-bass, tomato-soup, truffle-burger, penne-arrabbiata) and `sofra-logo.svg`. This is served as-is via the `/` route iframe. Do not modify these static files unless I explicitly ask.

## What to build next
I am ready to start building out the admin sub-pages and connecting the menu data to a real backend. Please wait for my next instruction and do not make any changes on your own.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hap-menu-magic.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cc3f1ab2-a3e0-490a-8b87-3ba677f75f08).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
