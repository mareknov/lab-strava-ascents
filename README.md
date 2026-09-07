# Bike ascents — climb profile report

A single-file HTML report that takes a bike ride's GPS track and breaks its
climbs into fixed-length slots, showing the gradient of each one.

Currently it ships six hardcoded rides. The goal of the next phase is to let
anyone upload their own activity instead.

Open `slovak-bike-ascents.html` in a browser to see what it does today.

## What's here

    template.html                    the application: layout, CSS, and all logic
    build.py                         build step — injects ride data into the template
    rides/*.json                     six rides, as raw stream arrays
    prototype-climb-detection.py     the climb detector in Python, for checking changes
    slovak-bike-ascents.html         the built output

## Rebuilding

    python3 build.py

No dependencies. Reads `template.html` and `rides/*.json`, writes
`slovak-bike-ascents.html`.

## How it works

`build.py` does no computation. It rounds the stream arrays, attaches
hand-written per-ride metadata, and substitutes the whole lot into the
`/*RIDES*/` placeholder in `template.html`. That is the entire build.

Everything the reader sees is computed in JavaScript at page load, from the
raw arrays:

- **`prep()`** — total ascent, long stops (any gap over 10 minutes in the
  time stream), and climb detection.
- **Climb detection** — a climb ends once the road gives back more than 30 m
  from its high point; climbs gaining under 60 m are discarded. See
  `prototype-climb-detection.py` for the same algorithm with comments.
- **`slots()`** — splits the selected climb into 250 m, 500 m or 1 km pieces,
  interpolating altitude at each boundary. A trailing stub shorter than 35% of
  the slot length is folded into the previous slot.
- **`drawProfile()`** — renders the whole ride as an SVG area, clips it, and
  paints one coloured rectangle per slot inside the clip. Unselected climbs get
  a mid grey, the rest of the ride a light grey.

Because it's all client-side, the page needs no server and works from a file://
URL.

## Ride data format

Each file in `rides/` is four parallel arrays, one entry per sample point:

    {
      "distance":   [...],   metres from the start, monotonic
      "altitude":   [...],   metres
      "heart_rate": [...],   bpm
      "time":       [...]    seconds elapsed since the start
    }

These came from the Strava API at roughly 350–500 sample points per ride. The
`time` array is elapsed, not moving, which is how the stop markers are found.

Per-ride metadata (display name, date, moving time, Strava's own elevation
total, and the intro paragraph) is written by hand in `build.py`. Note that the
elevation figure shown is Strava's, not the one computed from the arrays — the
downsampled track loses small bumps and reads 2–3% low.

## Adding a ride, as things stand

1. Drop a JSON file in `rides/`.
2. Add a `dict(load('rides/x.json'), ...)` entry in `build.py`.
3. Rerun the build.

`template.html` doesn't change. Tabs, climb pickers and scaling are all derived
from the data.

## Known rough edges

- Ride metadata is hardcoded rather than read from the data.
- The climb detector's 30 m tolerance is a constant, not a setting. It gives
  good results on these six rides but hasn't been tested on anything flat, on
  an out-and-back with a rolling middle, or on a track with noisy barometric
  altitude.
- Gradient colour bands are absolute (under 3%, 3–5%, 5–7%, 7–9%, over 9%), so
  a gentle ride shows as all green. That's deliberate for comparing rides, but
  it makes a flat ride's profile uninformative on its own.
- Heart rate is averaged over whatever sample points fall inside a slot, which
  is approximate at 250 m resolution.
- No handling of a missing stream. A ride recorded without a heart-rate strap
  will break `hrBetween()`.
