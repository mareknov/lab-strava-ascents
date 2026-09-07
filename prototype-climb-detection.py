"""
Reference implementation of the climb detector, in Python.

The shipped page runs this same algorithm in JavaScript (see the `prep()`
function in template.html). This script exists so the algorithm can be
checked and changed against real data without opening a browser.

Run:  python3 prototype-climb-detection.py
"""

import json
import pathlib

TOL = 30    # metres of descent that ends a climb
MIN = 60    # metres of gain a climb must have to count


def detect(dist, alt, tol=TOL, min_gain=MIN):
    """Split a track into sustained climbs.

    Walks the track holding two markers: the lowest point since the last
    reset (start) and the highest point seen since then (peak). Once the
    road gives back more than `tol` metres from the peak, the climb is
    closed and both markers reset to the current point.
    """
    climbs = []
    start = peak = 0
    for i in range(1, len(alt)):
        if alt[i] >= alt[peak]:
            peak = i
        if alt[peak] - alt[i] > tol:
            if alt[peak] - alt[start] >= min_gain:
                climbs.append((start, peak))
            start = peak = i
        if peak == start and alt[i] <= alt[start]:
            start = i
    if alt[peak] - alt[start] >= min_gain:
        climbs.append((start, peak))
    return climbs


def total_ascent(alt):
    return sum(max(0, alt[i + 1] - alt[i]) for i in range(len(alt) - 1))


if __name__ == "__main__":
    for path in sorted(pathlib.Path("rides").glob("*.json")):
        d = json.loads(path.read_text())
        dist, alt = d["distance"], d["altitude"]
        print(f"\n== {path.stem}  {dist[-1] / 1000:.1f} km, "
              f"{total_ascent(alt):.0f} m climbed")
        for a, b in detect(dist, alt):
            length = dist[b] - dist[a]
            gain = alt[b] - alt[a]
            print(f"   {dist[a] / 1000:6.2f} - {dist[b] / 1000:6.2f} km   "
                  f"{length / 1000:5.2f} km   +{gain:4.0f} m   "
                  f"{gain / length * 100:4.1f}%")
