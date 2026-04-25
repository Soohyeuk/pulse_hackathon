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
            "id": r.myid,
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

import httpx

@app.get("/systems/{system_id}/stops/{stop_id}/arrivals")
def get_arrivals(system_id: int, stop_id: str):
    system = _get_system(system_id)

    routes = system.getRoutes()
    serving_routes = []
    for route in routes:
        route_stops = route.getStops()
        for i, s in enumerate(route_stops):
            if str(s.id) == stop_id:
                serving_routes.append({"routeId": route.myid, "position": i + 1})
                break

    if not serving_routes:
        raise HTTPException(status_code=404, detail=f"Stop {stop_id} not found on any route")

    all_etas = []
    for sr in serving_routes:
        params = {
            "eta": 3,
            "deviceId": 134599635,
            "stopIds": stop_id,
            "routeId": sr["routeId"],
            "position": sr["position"],
            "userId": system_id,
        }
        response = httpx.get("https://passiogo.com/mapGetData.php", params=params)
        data = response.json()

        # "0000" means PassioGo didn't recognize the stop/route combo, skip it
        etas = data.get("ETAs", {}).get(stop_id, [])

        for e in etas:
            all_etas.append({
                "eta": e.get("eta"),
                "etaMinutes": e.get("etaR"),
                "secondsAway": e.get("secondsSpent"),
                "routeId": sr["routeId"],
                "routeName": e.get("theStop", {}).get("routeName"),
                "stopName": e.get("theStop", {}).get("name"),
                "busName": e.get("busName"),
                "busLatLng": e.get("busLatLng"),
                "paxLoad": e.get("paxLoadS"),
                "scheduleTimes": e.get("scheduleTimes"),
                "solid": e.get("solid"),
                "outOfService": e.get("OOS"),
            })

    all_etas.sort(key=lambda x: int(x["secondsAway"]) if x["secondsAway"] else 9999)
    return {"stopId": stop_id, "stopName": all_etas[0]["stopName"] if all_etas else None, "arrivals": all_etas}

@app.get("/debug/routes")
def debug_routes():
    system = passiogo.getSystemFromID(1007)
    routes = system.getRoutes()
    return [{"id": r.id, "myid": r.myid, "name": r.name} for r in routes]


@app.get("/debug/route/{myid}/stops")
def debug_route_stops(myid: str):
    system = passiogo.getSystemFromID(1007)
    routes = system.getRoutes()
    route = next((r for r in routes if str(r.myid) == myid), None)
    if not route:
        return {"error": "route not found"}
    stops = route.getStops()
    return [{"id": s.id, "name": s.name} for s in stops]


@app.get("/debug/eta/{stop_id}")
def debug_eta(stop_id: str):
    system = passiogo.getSystemFromID(1007)
    routes = system.getRoutes()
    
    serving_routes = []
    for route in routes:
        route_stops = route.getStops()
        for i, s in enumerate(route_stops):
            if str(s.id) == stop_id:
                serving_routes.append({"routeId": route.myid, "position": i + 1})
                break

    results = []
    for sr in serving_routes:
        params = {
            "eta": 3,
            "deviceId": 134599635,
            "stopIds": stop_id,
            "routeId": sr["routeId"],
            "position": sr["position"],
            "userId": 1007,
        }
        response = httpx.get("https://passiogo.com/mapGetData.php", params=params)
        results.append({
            "params_sent": params,
            "raw_response": response.json()
        })

    return {"serving_routes": serving_routes, "results": results}