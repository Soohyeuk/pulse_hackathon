import { Map, Marker, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// NYU Washington Square
const NYU = { lng: -73.9965, lat: 40.7295 }

export default function MapView() {
  if (!TOKEN) {
    return (
      <div style={{ padding: 16 }}>
        Missing <code>VITE_MAPBOX_TOKEN</code> in <code>.env</code>. Restart the dev server after adding it.
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Map
        mapboxAccessToken={TOKEN}
        initialViewState={{ longitude: NYU.lng, latitude: NYU.lat, zoom: 14 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation
          showUserHeading
        />
        <Marker longitude={NYU.lng} latitude={NYU.lat} color="#57068c" />
      </Map>
    </div>
  )
}
