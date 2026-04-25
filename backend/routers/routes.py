import asyncio
import os
import time

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from google.transit import gtfs_realtime_pb2

load_dotenv()

router = APIRouter(prefix="/api/routes", tags=["routes"])

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")
MTA_BASE = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2F"

# NYU-area subway stops with coordinates
NYU_STATIONS = [
    {"name": "8 St-NYU",          "stop_id": "R16", "feed": "gtfs-nqrw", "lines": "N/Q/R/W", "lat": 40.7304, "lng": -73.9921},
    {"name": "Astor Pl",           "stop_id": "635", "feed": "gtfs",      "lines": "6",        "lat": 40.7301, "lng": -73.9913},
    {"name": "W 4 St (A/C/E)",    "stop_id": "A32", "feed": "gtfs-ace",  "lines": "A/C/E",    "lat": 40.7322, "lng": -73.9988},
    {"name": "W 4 St (B/D/F/M)",  "stop_id": "D20", "feed": "gtfs-bdfm", "lines": "B/D/F/M",  "lat": 40.7322, "lng": -73.9988},
    {"name": "Houston St",         "stop_id": "120", "feed": "gtfs",      "lines": "1",        "lat": 40.7282, "lng": -74.0051},
]


async def geocode(address: str) -> dict:
    """Convert an address string to lat/lng using Mapbox Geocoding API."""
    url = (
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/{httpx.URL(address)}/"
        f".json?access_token={MAPBOX_TOKEN}&limit=1"
    )
    # re-encode properly
    import urllib.parse
    encoded = urllib.parse.quote(address)
    # proximity biases results toward NYC, bbox restricts to NYC metro area
    url = (
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded}"
        f".json?access_token={MAPBOX_TOKEN}&limit=1&country=US"
        f"&proximity=-73.9857,40.7484"
        f"&bbox=-74.2591,40.4774,-73.7004,40.9176"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)

    data = r.json()
    if not data.get("features"):
        raise HTTPException(status_code=400, detail=f"Could not find location: {address}")

    lng, lat = data["features"][0]["center"]
    place_name = data["features"][0]["place_name"]
    return {"lat": lat, "lng": lng, "name": place_name}


async def mapbox_walking(origin_lng, origin_lat, dest_lng, dest_lat) -> dict:
    if not MAPBOX_TOKEN:
        raise HTTPException(status_code=500, detail="MAPBOX_TOKEN not set")

    url = (
        f"https://api.mapbox.com/directions/v5/mapbox/walking/"
        f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
        f"?access_token={MAPBOX_TOKEN}&overview=false"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)

    if r.status_code != 200 or not r.json().get("routes"):
        return None

    route = r.json()["routes"][0]
    return {
        "duration_sec": route["duration"],
        "distance_m": route["distance"],
    }


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    from math import radians, sin, cos, sqrt, atan2
    R = 6371
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def nearest_station(lat, lng):
    return min(NYU_STATIONS, key=lambda s: haversine_km(lat, lng, s["lat"], s["lng"]))


async def next_train_wait(station: dict) -> int:
    """Returns minutes until next train at this station."""
    url = MTA_BASE + station["feed"]
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)

    if r.status_code != 200:
        return 10  # fallback

    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(r.content)

    now = time.time()
    soonest = None

    for entity in feed.entity:
        if not entity.HasField("trip_update"):
            continue
        for stu in entity.trip_update.stop_time_update:
            if not stu.stop_id.startswith(station["stop_id"]):
                continue
            t = stu.arrival.time or stu.departure.time
            if t > now:
                if soonest is None or t < soonest:
                    soonest = t

    return int((soonest - now) / 60) if soonest else 10


async def build_walking_option(origin_lat, origin_lng, dest_lat, dest_lng):
    result = await mapbox_walking(origin_lng, origin_lat, dest_lng, dest_lat)
    if not result:
        return None
    return {
        "mode": "Walking",
        "segments": ["Walk entire route"],
        "total_minutes": round(result["duration_sec"] / 60, 1),
        "distance_m": round(result["distance_m"]),
    }


async def build_subway_option(origin_lat, origin_lng, dest_lat, dest_lng):
    station = nearest_station(origin_lat, origin_lng)

    walk_to_station, wait, walk_to_dest = await asyncio.gather(
        mapbox_walking(origin_lng, origin_lat, station["lng"], station["lat"]),
        next_train_wait(station),
        mapbox_walking(station["lng"], station["lat"], dest_lng, dest_lat),
    )

    if not walk_to_station or not walk_to_dest:
        return None

    # rough subway ride estimate: 2 min per km between station and destination
    ride_dist_km = haversine_km(station["lat"], station["lng"], dest_lat, dest_lng)
    ride_min = max(4, round(ride_dist_km * 2))

    total = (
        walk_to_station["duration_sec"] / 60
        + wait
        + ride_min
        + walk_to_dest["duration_sec"] / 60
    )

    return {
        "mode": "Walk + Subway",
        "segments": [
            f"Walk to {station['name']} ({round(walk_to_station['duration_sec'] / 60, 1)} min)",
            f"Wait {wait} min for {station['lines']} train",
            f"Subway ride (~{ride_min} min)",
            f"Walk to destination ({round(walk_to_dest['duration_sec'] / 60, 1)} min)",
        ],
        "total_minutes": round(total, 1),
        "station": station["name"],
        "lines": station["lines"],
    }


async def build_shuttle_option(origin_lat, origin_lng, dest_lat, dest_lng):
    # Placeholder — wire in PassioGo API here when ready
    return None


@router.get("")
async def compare_routes(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
):
    """Compare walking, subway, and shuttle options between two coordinates."""
    walking, subway, shuttle = await asyncio.gather(
        build_walking_option(origin_lat, origin_lng, dest_lat, dest_lng),
        build_subway_option(origin_lat, origin_lng, dest_lat, dest_lng),
        build_shuttle_option(origin_lat, origin_lng, dest_lat, dest_lng),
    )

    options = [opt for opt in [walking, subway, shuttle] if opt is not None]
    options.sort(key=lambda x: x["total_minutes"])

    return {
        "origin": {"lat": origin_lat, "lng": origin_lng},
        "destination": {"lat": dest_lat, "lng": dest_lng},
        "options": options,
        "recommended": options[0] if options else None,
    }
