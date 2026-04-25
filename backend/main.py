# main.py
from fastapi import FastAPI, HTTPException, Query
from typing import Optional
import passiogo

app = FastAPI(title="PassioGo Transit API", version="1.0.0")


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get_system(system_id: int):
    system = passiogo.getSystemFromID(system_id)
    if system is None:
        raise HTTPException(status_code=404, detail=f"System {system_id} not found")
    return system


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/systems/{system_id}/routes")
def get_routes(system_id: int):
    """Return all routes for a given transportation system."""
    system = _get_system(system_id)
    routes = system.getRoutes()

    return [
        {
            "id": r.id,
            "name": r.name,
            "shortName": r.shortName,
            "groupColor": r.groupColor,
            "serviceTime": r.serviceTime,
            "serviceTimeShort": r.serviceTimeShort,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "outdated": r.outdated,
            "archive": r.archive,
        }
        for r in routes
    ]


@app.get("/systems/{system_id}/routes/{route_id}/stops")
def get_route_stops(system_id: int, route_id: str):
    """Return all stops for a specific route."""
    system = _get_system(system_id)
    routes = system.getRoutes()

    route = next((r for r in routes if str(r.id) == route_id), None)
    if route is None:
        raise HTTPException(status_code=404, detail=f"Route {route_id} not found")

    stops = route.getStops()

    return [
        {
            "id": s.id,
            "name": s.name,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "radius": s.radius,
        }
        for s in stops
    ]


# ---------------------------------------------------------------------------
# Realtime vehicles
# ---------------------------------------------------------------------------

@app.get("/systems/{system_id}/vehicles")
def get_vehicles(
    system_id: int,
    route_id: Optional[str] = Query(default=None, description="Filter by route ID"),
):
    """Return realtime vehicle positions. Optionally filter by route_id."""
    system = _get_system(system_id)
    vehicles = system.getVehicles()

    if route_id:
        vehicles = [v for v in vehicles if str(v.routeId) == route_id]

    return [
        {
            "id": v.id,
            "name": v.name,
            "type": v.type,
            "routeId": v.routeId,
            "routeName": v.routeName,
            "color": v.color,
            "latitude": v.latitude,
            "longitude": v.longitude,
            "speed": v.speed,
            "paxLoad": v.paxLoad,
            "outOfService": v.outOfService,
            "calculatedCourse": v.calculatedCourse,
            "created": v.created,
        }
        for v in vehicles
    ]


# ---------------------------------------------------------------------------
# Stops
# ---------------------------------------------------------------------------

@app.get("/systems/{system_id}/stops")
def get_stops(system_id: int):
    """Return all stops for a transportation system."""
    system = _get_system(system_id)
    stops = system.getStops()

    return [
        {
            "id": s.id,
            "name": s.name,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "radius": s.radius,
        }
        for s in stops
    ]


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

@app.get("/systems/{system_id}/alerts")
def get_alerts(system_id: int):
    """Return all active system alerts."""
    system = _get_system(system_id)
    alerts = system.getSystemAlerts()

    return [
        {
            "id": a.id,
            "name": a.name,
            "html": a.html,
            "routeId": a.routeId,
            "important": a.important,
            "dateTimeFrom": a.dateTimeFrom,
            "dateTimeTo": a.dateTimeTo,
            "createdF": a.createdF,
        }
        for a in alerts
    ]


# ---------------------------------------------------------------------------
# System lookup utilities
# ---------------------------------------------------------------------------

@app.get("/systems")
def list_systems():
    """Return all available PassioGo transportation systems."""
    systems = passiogo.getSystems()
    return [
        {
            "id": s.id,
            "name": s.name,
            "username": s.username,
            "homepage": s.homepage,
        }
        for s in systems
    ]

# hello