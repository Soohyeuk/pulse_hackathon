"""Mock multi-network routing.

Algorithm: for each network (MTA, NYU shuttle), find the closest stop to origin
and the closest stop to destination on each line. If both stops belong to the
same line, that line is a candidate. Total time =
walk_to_stop + headway/2 + ride + walk_from_stop. Best per network is returned;
no transfers, no mixed networks.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
WALK_KMH = 5.0
MAX_WALK_KM = 1.0  # if nearest stop is farther, the network has no route


def haversine_km(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp = math.radians(b_lat - a_lat)
    dl = math.radians(b_lng - a_lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def walk_minutes(km: float) -> float:
    return (km / WALK_KMH) * 60.0


def _load(filename: str, key: str) -> list[dict]:
    with open(DATA_DIR / filename) as f:
        return json.load(f)[key]


def _best_route_on_network(
    lines: list[dict],
    origin: tuple[float, float],
    dest: tuple[float, float],
    mode_label: str,
) -> dict | None:
    """Find fastest single-line trip on a network. Returns None if none viable."""
    best = None

    for line in lines:
        stops = line["stops"]
        # nearest stop to origin and to destination on THIS line
        i_from, d_from = min(
            (
                (i, haversine_km(origin[0], origin[1], s["lat"], s["lng"]))
                for i, s in enumerate(stops)
            ),
            key=lambda x: x[1],
        )
        i_to, d_to = min(
            (
                (i, haversine_km(dest[0], dest[1], s["lat"], s["lng"]))
                for i, s in enumerate(stops)
            ),
            key=lambda x: x[1],
        )

        if d_from > MAX_WALK_KM or d_to > MAX_WALK_KM:
            continue
        if i_from == i_to:
            continue  # same stop — no ride needed; just walk

        stops_between = abs(i_to - i_from)
        ride_time = stops_between * line["avg_per_stop_min"]
        wait_time = line["headway_min"] / 2.0
        walk_in = walk_minutes(d_from)
        walk_out = walk_minutes(d_to)
        total = walk_in + wait_time + ride_time + walk_out

        # geometry: walk leg + ride leg (between stops, in travel order) + walk leg
        lo, hi = sorted([i_from, i_to])
        ride_coords = [[s["lng"], s["lat"]] for s in stops[lo : hi + 1]]
        if i_from > i_to:
            ride_coords.reverse()

        candidate = {
            "type": mode_label,
            "line_id": line["id"],
            "line_name": line["name"],
            "total_time_min": round(total, 1),
            "segments": [
                {"mode": "walk", "time": round(walk_in, 1), "distance_km": round(d_from, 2)},
                {"mode": "wait", "time": round(wait_time, 1)},
                {"mode": mode_label, "time": round(ride_time, 1), "stops": stops_between},
                {"mode": "walk", "time": round(walk_out, 1), "distance_km": round(d_to, 2)},
            ],
            "boarding_stop": stops[i_from],
            "alighting_stop": stops[i_to],
            "geometry": {
                "walk_to": [
                    [origin[1], origin[0]],
                    [stops[i_from]["lng"], stops[i_from]["lat"]],
                ],
                "ride": ride_coords,
                "walk_from": [
                    [stops[i_to]["lng"], stops[i_to]["lat"]],
                    [dest[1], dest[0]],
                ],
            },
        }

        if best is None or candidate["total_time_min"] < best["total_time_min"]:
            best = candidate

    return best


def compare_routes(
    from_lat: float, from_lng: float, to_lat: float, to_lng: float
) -> dict:
    origin = (from_lat, from_lng)
    dest = (to_lat, to_lng)

    mta_lines = _load("mta_lines.json", "lines")
    shuttle_lines = _load("nyu_shuttle.json", "routes")

    mta = _best_route_on_network(mta_lines, origin, dest, "subway")
    shuttle = _best_route_on_network(shuttle_lines, origin, dest, "shuttle")

    # Walking is always available — baseline option.
    walk_km = haversine_km(from_lat, from_lng, to_lat, to_lng)
    walk_time = walk_minutes(walk_km)
    walking = {
        "network": "walking",
        "type": "walk",
        "line_id": None,
        "line_name": "Walking",
        "total_time_min": round(walk_time, 1),
        "segments": [
            {"mode": "walk", "time": round(walk_time, 1), "distance_km": round(walk_km, 2)},
        ],
        "boarding_stop": None,
        "alighting_stop": None,
        "geometry": {
            "walk_to": [[from_lng, from_lat], [to_lng, to_lat]],
            "ride": [],
            "walk_from": [],
        },
    }

    routes = [walking]
    if mta:
        mta["network"] = "mta"
        routes.append(mta)
    if shuttle:
        shuttle["network"] = "shuttle"
        routes.append(shuttle)

    best = min(routes, key=lambda r: r["total_time_min"])
    return {"best": best["network"], "routes": routes}
