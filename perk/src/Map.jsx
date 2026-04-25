import { useRef, useState } from 'react'
import { Map, Marker } from 'react-map-gl/mapbox'
import PlaceDetail from './PlaceDetail'
import 'mapbox-gl/dist/mapbox-gl.css'
import MapOverlay from './MapOverlay'
import SearchScreen from './SearchScreen'
import benefitsData from './data/nyu_benefits.json'
import './MapControls.css'

const CATEGORY_COLORS = {
  restaurant: '#e85d3a',
  museum: '#2d7be5',
  cafe: '#a26b3a',
  clothing: '#d63384',
  culture: '#5219A7',
}

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const NYU = { lng: -73.9965, lat: 40.7295 }

export default function MapView() {
  const mapRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [userLoc, setUserLoc] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const benefits = benefitsData.benefits

  if (!TOKEN) {
    return (
      <div style={{ padding: 16 }}>
        Missing <code>VITE_MAPBOX_TOKEN</code> in <code>.env</code>. Restart the dev server after adding it.
      </div>
    )
  }

  const handleLocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords
        setUserLoc({ lng: longitude, lat: latitude })
        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          essential: true,
        })
      },
      (err) => console.warn('geolocation failed', err),
      { enableHighAccuracy: true }
    )
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <MapOverlay onOpenSearch={() => setSearchOpen(true)} />
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        initialViewState={{ longitude: NYU.lng, latitude: NYU.lat, zoom: 14 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
      >
        <Marker longitude={NYU.lng} latitude={NYU.lat} color="#57068c" />

        {userLoc && (
          <Marker longitude={userLoc.lng} latitude={userLoc.lat} anchor="center">
            <div className="user-location">
              <div className="user-location__pulse" />
              <div className="user-location__dot" />
            </div>
          </Marker>
        )}

        {benefits.map((b) => (
          <Marker
            key={b.id}
            longitude={b.coordinates.lng}
            latitude={b.coordinates.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              setSelected(b)
              mapRef.current?.flyTo({
                center: [b.coordinates.lng, b.coordinates.lat],
                zoom: 16,
                essential: true,
              })
            }}
          >
            <div
              className="benefit-pin"
              style={{ background: CATEGORY_COLORS[b.category] || '#5219A7' }}
              title={b.name}
            />
          </Marker>
        ))}

      </Map>

      <PlaceDetail place={selected} onClose={() => setSelected(null)} />

      {searchOpen && (
        <SearchScreen
          benefits={benefits}
          onClose={() => setSearchOpen(false)}
          onSelect={(b) => {
            setSearchOpen(false)
            setSelected(b)
            mapRef.current?.flyTo({
              center: [b.coordinates.lng, b.coordinates.lat],
              zoom: 16,
              essential: true,
            })
          }}
        />
      )}

      <div className="map-fabs">
        <button
          type="button"
          className="map-fab"
          aria-label="My location"
          onClick={handleLocate}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.4 10.6 20 3l-7.6 16.6-2-7.4-7-1.6z" />
          </svg>
        </button>
        <button
          type="button"
          className="map-fab"
          aria-label="Discover"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6z" />
            <path d="M19 14l.9 2.6L22 18l-2.1.4L19 21l-.9-2.6L16 18l2.1-1.4z" opacity="0.85" />
          </svg>
        </button>
      </div>
    </div>
  )
}
