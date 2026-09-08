# Bike ascents — climb profile report

A static page that takes a bike ride's GPS track and breaks its climbs into
fixed-length slots, showing the gradient and heart rate of each one.

Six curated rides ship with the page. Anyone can add their own with the **Add
your own ride** button — GPX, TCX or FIT, parsed in the browser. Your rides sit at
the front of the list, newest first, with the curated peaks alongside — so you
can read your climb against the same roads rather than on its own.

Nothing is uploaded anywhere. There is no server, no account and no analytics.
Your file is read by the page and stays in your browser.

## Layout

    packages/domain/         the analysis — pure, no DOM, no dependencies
    packages/ride-import/    file -> Track -> Ride; GPX, TCX and FIT adapters
    apps/web/                the browser app: shell, styles, views, app.ts
    apps/api/                reserved for a future service. Does not exist yet.
    rides/*.json             the six sample rides, as raw stream arrays
    rides/metadata.json      their hand-written names, dates and prose
    tools/                   build, sample packing, fixture generation
    test/                    parity suite against the Python oracle
    prototype-climb-detection.py   the reference implementation

`@ascents/domain` compiles with neither the DOM nor the Node type library, so it
cannot reach for `document` or `fs` even by accident. That is what lets the same
analysis run in the page today and behind an HTTP endpoint later.

## Working on it

    npm install
    npm run dev        build, watch, and serve on :8000
    npm run build      production build into dist/
    npm run typecheck
    npm run lint
    npm run fixtures   generate test/fixtures from rides/*.json
    npm test           parity suite (needs python3)
    npm run samples    regenerate apps/web/src/samples.generated.ts

`npm run samples` is not part of the build. Its output is committed and only
needs rerunning when a sample ride or its metadata changes.

## How it works

The pipeline is the same whether a ride comes from the bundled samples or from
an uploaded file:

    file --sniff--> gpx | tcx | fit --> Track --> normalise --> Ride --> analyse --> render

- **Climb detection** — a climb ends once the road gives back more than 30 m
  from its high point; climbs gaining under 60 m are discarded.
- **Slots** — the selected climb is split into 250 m, 500 m or 1 km pieces,
  interpolating altitude at each boundary. A trailing stub shorter than 35% of
  the slot length folds into the previous slot.
- **Stops** — any gap over 10 minutes in the elapsed-time stream.
- **Profile** — the ride is drawn as an SVG area, clipped, with one coloured
  rectangle painted per slot inside the clip. Heart rate runs as a red line
  along the bottom quarter of the plot, on its own right-hand axis. It is kept
  to a band because across the full height it weaves through the elevation line
  and the two become hard to tell apart. It carries a paper-coloured halo so it
  stays legible over the darker gradient bands. Rides without heart rate lose
  the line, the axis and the bpm column entirely.

### Heart rate is bridged before it is resampled

Devices routinely log heart rate far less often than position — one reading
every five to ten seconds against 1 Hz for GPS. Left alone, the channel is
mostly empty, the holes survive resampling, and the trace draws as dozens of
disconnected specks. On a real 90-minute ride only 802 of 5330 records carried
a reading, and the line came out as 28 fragments.

So silences up to 60 seconds are interpolated across, and anything longer stays
a gap. That threshold is where the two separate on real files: on the same ride
(median gap 5 s, p90 9 s) raising it from 30 s to 60 s removed seven breaks,
while 60 s to 90 s removed none — nothing falls in between. What remains past a
minute is a handful of multi-minute outages, worth showing rather than papering
over. Runs too short to read as a line are dropped at draw time for the same
reason: stranded inside a dropout they look like noise, not data.

### Two things happen in a deliberate order

**Ascent and pedalling time are measured before resampling.** A raw recording
arrives at 1 Hz, and summing every positive step over that inflates the total
badly because barometric jitter accumulates. Ascent is taken from the
full-resolution track with a 1 m noise gate — or from the device's own figure,
which FIT files carry and which beats anything computed. The old page copied
Strava's number in by hand for exactly this reason; that hack is gone.

**Then the track is resampled onto a 100 m grid.** The detector's 30 m tolerance
was tuned against Strava-downsampled streams roughly 50–150 m apart. At raw
resolution, noise shatters a single climb into fragments. Normalising is what
lets an uploaded ride and a curated one be read on the same terms.

## Verifying the analysis

`prototype-climb-detection.py` is the reference implementation and the oracle
the test suite compares against — it is not dead code. `npm test` runs it and
asserts, for all six rides:

- the TypeScript detector finds byte-identical climb indices and total ascent;
- every ride round-trips through GPX, TCX and FIT back to the same climbs.

Two format quirks are asserted rather than papered over:

- **FIT** stores altitude as a uint16 with scale 5, so it quantises to 0.2 m.
- **GPX** carries no distance channel, so distance is integrated from lat/lon.
  Over a few hundred points that lands a fraction of a metre off, which is
  enough to break a tie where a summit is a plateau. On `kojsovka`, two samples
  both read 1241.5 m and the detected peak moves by one sample — 156 m of road,
  0.28 m of height. TCX and FIT carry real distance and match exactly.

If you change the detector or the slot maths, run `npm test`. If the numbers
move, that is the contract telling you so.

## Deployment

GitHub Actions builds and publishes `dist/` to GitHub Pages on every push to
`main`. Pull requests get the same build and test run without deploying.

## Known rough edges

- Gradient colour bands are absolute (under 3%, 3–5%, 5–7%, 7–9%, over 9%), so
  a gentle ride shows as all green. Deliberate, for comparing rides — but it
  makes a flat ride's profile uninformative on its own.
- Heart rate is averaged over whatever sample points fall inside a slot, which
  is approximate at 250 m resolution.
- The 30 m tolerance and 60 m minimum gain are constants, not settings. They
  give good results on these six rides but have not been tested on anything
  flat, or on a track with noisy barometric altitude.
- Uploaded rides persist in `localStorage`. Clearing site data removes them,
  and they do not follow you between browsers.
- A ride whose file has no elevation data is rejected with an explanation,
  since there is nothing to measure.
