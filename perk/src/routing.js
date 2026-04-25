// Calls the FastAPI backend that compares MTA + NYU shuttle routes,
// then replaces straight-line walk segments with real Mapbox walking geometry.

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

async function fetchWalkingGeometry(coords) {
  // coords: [[lng,lat], [lng,lat]]
  if (!coords || coords.length < 2) return coords
  const [a, b] = [coords[0], coords[coords.length - 1]]
  // Skip if endpoints are essentially identical (avoid wasted API call).
  if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) return coords
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/walking/` +
    `${a[0]},${a[1]};${b[0]},${b[1]}` +
    `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
  try {
    const res = await fetch(url)
    if (!res.ok) return coords
    const data = await res.json()
    return data.routes?.[0]?.geometry?.coordinates || coords
  } catch {
    return coords
  }
}

async function enrichWithWalkingGeometry(route) {
  const { walk_to, walk_from } = route.geometry
  const [newWalkTo, newWalkFrom] = await Promise.all([
    fetchWalkingGeometry(walk_to),
    fetchWalkingGeometry(walk_from),
  ])
  return {
    ...route,
    geometry: { ...route.geometry, walk_to: newWalkTo, walk_from: newWalkFrom },
  }
}

export async function getTransitRoutes(from, to) {
  const params = new URLSearchParams({
    from_lat: from.lat,
    from_lng: from.lng,
    to_lat: to.lat,
    to_lng: to.lng,
  })
  const res = await fetch(`${API_BASE}/route?${params}`)
  if (!res.ok) throw new Error(`Routing API failed: ${res.status}`)
  const data = await res.json()
  if (!data.routes?.length) return data

  const enrichedRoutes = await Promise.all(
    data.routes.map(async (r) => {
      if (r.network === 'walking') {
        // Walking-only: replace the entire walk_to (origin → dest) with real geometry.
        const real = await fetchWalkingGeometry(r.geometry.walk_to)
        return { ...r, geometry: { ...r.geometry, walk_to: real } }
      }
      return enrichWithWalkingGeometry(r)
    })
  )
  return { ...data, routes: enrichedRoutes }
}

export const NETWORK_COLORS = {
  mta: '#0039A6',
  shuttle: '#57068c',
  walking: '#1f9d55',
}

// Flatten the backend's segmented geometry into one LineString per route.
export function flattenGeometry(route) {
  const { walk_to, ride, walk_from } = route.geometry
  const out = [...walk_to]
  if (ride && ride.length) out.push(...ride.slice(1))
  if (walk_from && walk_from.length) out.push(...walk_from.slice(1))
  return out
}
