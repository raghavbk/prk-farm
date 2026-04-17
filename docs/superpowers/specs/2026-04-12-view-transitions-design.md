# View Transitions & Motion Animation — Design Spec

## Goal

Add smooth, fluid page transitions and micro-animations to Farm Share Ledger using React 19's native `<ViewTransition>` component and CSS animations. Zero additional dependencies.

## Architecture

React 19's `<ViewTransition>` component wraps page content and triggers the browser's View Transition API during `startTransition`-powered navigations. Next.js 16's `experimental.viewTransition` flag automatically wraps `<Link>` navigations. CSS animation recipes handle the visual motion. The nav bar is isolated from transitions via `viewTransitionName` so it stays static during page slides.

## Navigation Map

| From | To | Direction | Animation |
|------|----|-----------|-----------|
| Dashboard `/` | Group Detail `/groups/[id]` | forward | Slide from right |
| Group Detail | Dashboard | back | Slide from left |
| Groups List `/groups` | Group Detail | forward | Slide from right |
| Groups List | New Group `/groups/new` | forward | Slide from right |
| Group Detail | Add Expense | forward | Slide from right |
| Group Detail | Edit Expense | forward | Slide from right |
| Group Detail | Edit Group | forward | Slide from right |
| Any page | Tenants `/tenants` | lateral | Cross-fade (no direction) |
| Suspense boundary | Content loaded | reveal | Slide up + fade in |

## Page Transitions

### Directional Slides (hierarchical navigation)

Each page component is wrapped in a `<ViewTransition>` with type-keyed enter/exit:

```jsx
<ViewTransition
  enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
  exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
  default="none"
>
  <div>...page content...</div>
</ViewTransition>
```

Navigation links use `transitionTypes` to declare direction:
- Forward: `<Link href={...} transitionTypes={["nav-forward"]}>`
- Back: `<Link href={...} transitionTypes={["nav-back"]}>`

`default="none"` on every `<ViewTransition>` prevents unwanted cross-fades on revalidation or Suspense resolves.

### Suspense Reveals (loading → content)

Existing `loading.tsx` files get `<ViewTransition exit="slide-down">` on the skeleton. Page content gets `<ViewTransition enter="slide-up" default="none">`. Uses simple string props (not type maps) since Suspense reveals fire without transition types.

### Persistent Nav Bar

The sticky header nav gets `style={{ viewTransitionName: "site-nav" }}` to isolate it from page transition snapshots. CSS rule `::view-transition-group(site-nav) { animation: none; }` keeps it motionless.

## Micro-Animations

All implemented via Tailwind utility classes and a small set of CSS additions in `globals.css`.

### Buttons
- Hover: background color transition, 200ms ease
- Active/press: `transform: scale(0.97)`, 100ms ease-out, springs back 300ms ease-out
- Disabled: reduced opacity, no transform

### Cards & List Items (group cards, expense rows, tenant list)
- Hover: `translateY(-1px)` + subtle shadow increase, 200ms ease-out
- Existing `transition-colors` classes are already on most elements

### Form Inputs
- Focus: border color + ring transition, 200ms ease (already partially in place via Tailwind `focus:` utilities — will ensure consistency)

### Dropdown/Search Results (member search)
- Appear: fade in + slide down from top, 150ms ease-out
- Disappear: fade out, 100ms ease-in

## CSS Recipes

All animation CSS is copied from the View Transition API recipe set into `globals.css`:

- Timing variables: `--duration-exit: 150ms`, `--duration-enter: 210ms`, `--duration-move: 350ms` (adjusted from default 400ms for the "smooth & fluid" feel)
- Shared keyframes: `fade`, `slide`, `slide-y`
- Directional: `slide-from-right`, `slide-to-left`, `slide-from-left`, `slide-to-right`
- Reveal: `slide-up`, `slide-down`
- Persistent element isolation for nav
- Reduced motion media query that zeroes all animation durations

## Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*),
  ::view-transition-group(*) {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
```

## Files to Modify

| File | Change |
|------|--------|
| `next.config.ts` | Add `experimental: { viewTransition: true }` |
| `src/app/globals.css` | Add all CSS animation recipes + micro-animation classes |
| `src/components/nav.tsx` | Add `viewTransitionName: "site-nav"` style |
| `src/app/(protected)/page.tsx` | Wrap in `<ViewTransition>` with type-keyed enter/exit |
| `src/app/(protected)/groups/page.tsx` | Same wrapper + `transitionTypes` on group links |
| `src/app/(protected)/groups/[groupId]/page.tsx` | Same wrapper + `transitionTypes` on links |
| `src/app/(protected)/groups/new/page.tsx` | ViewTransition wrapper |
| `src/app/(protected)/groups/[groupId]/edit/page.tsx` | ViewTransition wrapper |
| `src/app/(protected)/groups/[groupId]/expenses/new/page.tsx` | ViewTransition wrapper |
| `src/app/(protected)/groups/[groupId]/expenses/[expenseId]/edit/page.tsx` | ViewTransition wrapper |
| `src/app/(protected)/tenants/page.tsx` | ViewTransition wrapper (fade only, lateral) |
| `src/app/(protected)/loading.tsx` | Wrap skeleton in `<ViewTransition exit="slide-down">` |
| `src/app/(protected)/groups/loading.tsx` | Same |
| `src/app/(protected)/groups/[groupId]/loading.tsx` | Same |

## Files NOT Modified

- `src/app/(protected)/layout.tsx` — layouts persist across navigations, VTs in layouts suppress page-level enter/exit. No VT wrapper here.
- `src/app/layout.tsx` — root layout, same reason.
- Server action files — no animation concern.
- Test files — view transitions are visual-only, no unit test changes needed.

## Timing Values

| Property | Value | Rationale |
|----------|-------|-----------|
| `--duration-exit` | 150ms | Old content disappears quickly so new content isn't blocked |
| `--duration-enter` | 210ms | Slightly longer for the new content to settle in |
| `--duration-move` | 350ms | Directional slide — smooth but not sluggish |
| Button press | 100ms ease-out | Immediate tactile feedback |
| Button release | 300ms ease-out | Smooth return, iOS-like |
| Hover lift | 200ms ease-out | Quick but not jarring |
