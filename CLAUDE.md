# Project brief

## Goal

Anyone can drop their own ride onto the page and get the same climb-slot
analysis back. Six curated rides ship with it as a landing page and as a
comparison set.

## Start here

Read `README.md`. Then `npm install && npm run dev` and open the page. The
analysis is the value in this repo: climb detection, slot splitting, gradient
bands, the SVG profile, the layout and styling. Preserve its behaviour rather
than reinventing it.

## Architecture

An npm-workspaces monorepo. Feature-first, with the hexagon where it earns its
place rather than everywhere:

- `packages/domain` — the analysis. Pure, zero runtime dependencies, and its
  tsconfig omits **both** the DOM and Node type libraries, so it cannot reach
  for `document` or `fs` even by accident. Keep it that way.
- `packages/ride-import` — the one real port. `TrackParser` has three
  interchangeable adapters (GPX, TCX, FIT); a Strava OAuth adapter would be a
  fourth and the domain would not notice.
- `apps/web` — the browser app. `app.ts` is the composition root: everything is
  constructed there and passed down. No DI container, no decorators.
- `apps/api` — reserved for a NestJS service. Not created yet. When it arrives
  it depends on `@ascents/domain` and becomes another driving adapter.

Cross-package encapsulation is enforced by each package's `exports` field, so a
deep import does not resolve. `eslint.config.js` turns the same mistake into a
lint error at the point it is written.

## Decisions already made

Do not silently reopen these. Revisit them only if the reasoning below stops
holding, and say what changed.

**Ride data comes from file upload**, parsed in the browser. No backend, no
OAuth, no Strava API terms, and no personal data leaving the machine. Strava
OAuth was considered and deferred; it needs a server for the token exchange.

**Uploads append, they do not replace.** The point is comparing your Kojšovka
against the curated one. `addRide` in `apps/web/src/state/catalog.ts` is where
that lives.

**Hosting is GitHub Pages.** `.github/workflows/deploy.yml` builds and
publishes `dist/` on push to `main`.

**The `file://` constraint has been retired.** It was right when there was no
hosting. Keeping it would have forbidden code splitting, which is the only
thing keeping the 390 KB Garmin FIT SDK out of the initial download — measured
at 59 KB gzipped now, against 535 KB uncompressed if everything were inlined
into one file. `file://` also has no HTTP layer and therefore no gzip, and it
blocks Web Workers and reliable `localStorage`. If offline use is ever wanted,
a service worker on Pages is the better answer.

**Sample rides keep their hand-written prose; uploaded rides render without
it.** No generated filler.

## Constraints

- **The analysis must stay verifiable.** `prototype-climb-detection.py` is the
  oracle, not dead code. If the climb detector or slot maths change, run
  `npm test` — it executes the Python and asserts all six rides still match,
  through all three file formats. If the numbers move, that is the contract
  speaking.
- **`packages/domain` stays pure.** No DOM, no Node, no I/O, no clock.
- Dependencies are `@garmin/fitsdk` (first-party, for a proprietary binary
  format), `fast-xml-parser` (keeps the XML parsers isomorphic and testable
  without jsdom) and `zod/mini`. Import zod as named exports from `zod/mini` —
  `import { z } from 'zod'` defeats tree-shaking and costs about 420 KB more.
- Keep the FIT adapter behind a dynamic `import()`. A static import silently
  undoes the code splitting.
- New third-party dependencies need a reason worth stating.

## Still open

- The gradient bands are absolute, so a flat ride reads as all green.
- The 30 m tolerance and 60 m minimum gain are constants, not settings, and are
  untested on flat or barometrically noisy tracks.
