# Project brief

## Goal

Turn the existing hardcoded report into something anyone can use with their own
ride: upload an activity, get the same climb-slot analysis back.

## Start here

Read `README.md` first — it explains what exists and how it works. Then open
`slovak-bike-ascents.html` in a browser to see the target output. The prototype
is the specification: its analysis is correct and has been checked against six
real rides, so preserve its behaviour rather than reinventing it.

## What is worth keeping

All of the analysis and rendering in `template.html`: climb detection, slot
splitting, gradient bands, the SVG profile, the layout and styling. This is the
value in the repo.

## What is expected to go

`build.py` in its current form. Build-time injection of hardcoded arrays
becomes runtime parsing of an uploaded file. The hand-written per-ride metadata
has to come from the uploaded file's own headers instead.

## Decisions not yet made

**Where ride data comes from.** File upload (GPX / TCX / FIT) parsed in the
browser needs no server, no auth and no third-party terms. Strava OAuth gives a
better experience but requires a backend for the token exchange and binds the
project to Strava's API terms, including attribution and restrictions on
storing other people's activity data. Read those terms before designing around
them.

**Static or backend.** Everything currently runs client-side. If the file-upload
route is taken, that can stay true — no hosting cost, no database, no personal
data leaving the user's machine. A backend is only needed for OAuth, saved
reports or share links.

Do not settle either of these unilaterally. Raise them.

## Constraints

- No build tooling and no dependencies at present. Keep it that way unless
  there's a concrete reason, and say what the reason is.
- The output must keep working from a `file://` URL.
- If the climb detector or slot maths change, verify against all six rides in
  `rides/` using `prototype-climb-detection.py` and check the numbers still
  match what the current page shows.
