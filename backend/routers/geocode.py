import os
import urllib.parse

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

load_dotenv()

router = APIRouter(prefix="/api/geocode", tags=["geocode"])

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")

NYC_BBOX = "-74.2591,40.4774,-73.7004,40.9176"
NYC_CENTER = "-73.9857,40.7484"


@router.get("/suggest")
async def suggest(query: str):
    """Return autocomplete suggestions for an address, biased to NYC."""
    if not MAPBOX_TOKEN:
        raise HTTPException(status_code=500, detail="MAPBOX_TOKEN not set")
    if len(query.strip()) < 2:
        return []

    encoded = urllib.parse.quote(query)
    url = (
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded}.json"
        f"?access_token={MAPBOX_TOKEN}"
        f"&autocomplete=true&limit=5&country=US"
        f"&proximity={NYC_CENTER}&bbox={NYC_BBOX}"
    )

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)

    if r.status_code != 200:
        return []

    features = r.json().get("features", [])
    return [
        {
            "name": f["place_name"],
            "lat": f["center"][1],
            "lng": f["center"][0],
        }
        for f in features
    ]
