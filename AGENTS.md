# Repository Guidelines

This repository hosts the Lenis Home Vite migration plus the experimental `card/` micro-app; use this guide to navigate the codebase, ship changes fast, and keep animations regress-free.

## Project Structure & Module Organization

Core source lives in `src/`, split by responsibility: `components/` for reusable UI + animation primitives, `sections/` for page-level slices, `pages/` for entry points such as `TestGsap`, `timeline/` for scroll choreography, `styles/` for Tailwind layer files, and `utils/`, `hooks/`, `store/` for shared logic. Static assets belong in `public/`. `docs/` captures deep-dive analyses; consult it before touching Feature Cards or GSAP timelines. `deprecated/` stores archived SCSS for reference only. The `card/` directory is a standalone Vite playground—treat it like a separate package when running commands.

## Build, Test & Development Commands

- `pnpm install` – sync dependencies (Tailwind v4 and React 19 require Node 20+).
- `pnpm dev` – launch the main Vite app at `localhost:5173`; pass `?test=gsap` to load the instrumentation page.
- `pnpm build` – runs `tsc -b` for type safety and produces `dist/` via `vite build`.
- `pnpm preview` – serves the production bundle for final visual QA.
- `cd card && pnpm install && pnpm dev` – work on the standalone card prototype without disturbing the root build.

## Coding Style & Naming Conventions

Use strict TypeScript, ES2022 modules, and 2-space indentation. React components and sections follow PascalCase, hooks stay in `useThing` form, Zustand slices belong in `store/index.ts`. Keep CSS scoped via `.module.css` when component-specific, otherwise extend the Tailwind layers in `src/styles/*.css`. Import aliases `@/` or `~/` must point to `src/`. Prefer small composable functions over monolithic animations, and annotate tricky GSAP timelines with inline comments.

## Testing Guidelines

There is no automated test suite yet; rely on type-checking plus visual validation. Before opening a PR, run `pnpm dev` and inspect scroll + RAF interactions in Chromium and Safari. Use the `?test=gsap` route to isolate Feature Cards changes, and replicate motion tweaks in the `card/` playground when exploring risky easing or Lenis settings.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit pattern (`feat:`, `fix:`, `refactor:`, `chore:`) so history stays searchable. Each commit should bundle one logical change set (e.g., “fix: stabilize FeatureCards parallax easing”). PRs need: a clear summary, linked issue or doc reference (`docs/FeatureCards-Animation-Deep-Dive.md` is common), screenshots or short clips for UI updates, and a checklist confirming `pnpm build` passes. Call out any new timelines, data files, or configuration toggles in the description so reviewers can focus on regression risks.
