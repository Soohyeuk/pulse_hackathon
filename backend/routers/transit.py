import time
from datetime import datetime

import httpx
from fastapi import APIRouter, HTTPException
from google.transit import gtfs_realtime_pb2

router = APIRouter(prefix="/api/transit", tags=["transit"])

MTA_BASE = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2F"

# NYU-area stop IDs (GTFS format) and which feed to use
NYU_STOPS = {
    "8 St-NYU":         {"stop_id": "R16", "feed": "gtfs-nqrw", "lines": "N/Q/R/W"},
    "Astor Pl":         {"stop_id": "635", "feed": "gtfs",      "lines": "6"},
    "W 4 St (A/C/E)":  {"stop_id": "A32", "feed": "gtfs-ace",  "lines": "A/C/E"},
    "W 4 St (B/D/F/M)":{"stop_id": "D20", "feed": "gtfs-bdfm", "lines": "B/D/F/M"},
    "Houston St":       {"stop_id": "120", "feed": "gtfs",      "lines": "1"},
}


async def fetch_feed(feed_name: str) -> gtfs_realtime_pb2.FeedMessage:
    url = MTA_BASE + feed_name

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url)

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"MTA API error: {response.status_code}")

    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(response.content)
    return feed


def parse_arrivals(feed: gtfs_realtime_pb2.FeedMessage, stop_id: str, limit: int = 5) -> list:
    now = time.time()
    arrivals = []

    for entity in feed.entity:
        if not entity.HasField("trip_update"):
            continue
        trip = entity.trip_update
        route = trip.trip.route_id

        for stop_time in trip.stop_time_update:
            sid = stop_time.stop_id
            # sid is like "R16N" or "R16S" — match the base stop ID
            if not sid.startswith(stop_id):
                continue

            arrival_time = stop_time.arrival.time if stop_time.arrival.time else stop_time.departure.time
            if arrival_time < now:
                continue

            minutes_away = int((arrival_time - now) / 60)
            direction = "Uptown" if sid.endswith("N") else "Downtown"

            arrivals.append({
                "route": route,
                "direction": direction,
                "minutes_away": minutes_away,
                "arrival_time": datetime.fromtimestamp(arrival_time).strftime("%H:%M"),
            })

    arrivals.sort(key=lambda x: x["minutes_away"])
    return arrivals[:limit]


@router.get("/arrivals")
async def get_nyu_arrivals():
    """Real-time subway arrivals for all NYU-area stops."""
    # deduplicate feeds so we don't fetch the same feed twice
    feeds_needed = {}
    for station, info in NYU_STOPS.items():
        feeds_needed.setdefault(info["feed"], []).append(station)

    results = {}
    for feed_name, stations in feeds_needed.items():
        feed = await fetch_feed(feed_name)
        for station in stations:
            info = NYU_STOPS[station]
            results[station] = {
                "lines": info["lines"],
                "arrivals": parse_arrivals(feed, info["stop_id"]),
            }

    return results


@router.get("/arrivals/{station_name}")
async def get_station_arrivals(station_name: str):
    """Real-time arrivals for a single NYU-area stop."""
    info = NYU_STOPS.get(station_name)
    if not info:
        raise HTTPException(
            status_code=404,
            detail=f"Station not found. Available: {list(NYU_STOPS.keys())}",
        )

    feed = await fetch_feed(info["feed"])
    return {
        "station": station_name,
        "lines": info["lines"],
        "arrivals": parse_arrivals(feed, info["stop_id"]),
    }
