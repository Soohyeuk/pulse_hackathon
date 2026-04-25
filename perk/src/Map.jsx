import { useRef, useState } from 'react'
import { Map, Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import MapOverlay from './MapOverlay'
import SearchScreen from './SearchScreen'
import PlaceDetail from './PlaceDetail'
import CompareRoutes from './CompareRoutes'
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
const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const NYU = { lng: -73.9965, lat: 40.7295 }

function AddressInput({ label, value, onChange, onSelect, placeholder }) {
  const [suggestions, setSuggestions] = useState([])
  const debounceRef = useRef(null)

  const handleChange = (e) => {
    const q = e.target.value
    onChange(q)
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/geocode/suggest?query=${encodeURIComponent(q)}`)
        setSuggestions(await res.json())
      } catch {
        setSuggestions([])
      }
    }, 300)
  }

  const handleSelect = (s) => {
    onChange(s.name)
    setSuggestions([])
    onSelect(s)
  }

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 3 }}>{label}</div>
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 10px', border: '1px solid #ddd',
          borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none',
        }}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff',
          border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 1000, overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <div key={i} onClick={() => handleSelect(s)} style={{
              padding: '9px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
            }}>
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RouteResult({ option, isFirst }) {
  return (
    <div style={{
      background: isFirst ? '#f0f7ff' : '#fafafa',
      border: isFirst ? '1.5px solid #3b82f6' : '1px solid #e5e5e5',
      borderRadius: 10, padding: '10px 12px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{option.mode}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: isFirst ? '#3b82f6' : '#333' }}>
          {option.total_minutes} min
        </span>
      </div>
      {option.segments.map((s, i) => (
        <div key={i} style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>• {s}</div>
      ))}
      {isFirst && (
        <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600, marginTop: 4 }}>RECOMMENDED</div>
      )}
    </div>
  )
}

function RoutePanel({ onClose }) {
  const [originText, setOriginText] = useState('')
  const [destText, setDestText] = useState('')
  const [originCoords, setOriginCoords] = useState(null)
  const [destCoords, setDestCoords] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOriginCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setOriginText('My Current Location')
      },
      () => setError('Could not get your location')
    )
  }

  const handleSearch = async () => {
    setError(null)
    setResults(null)
    if (!originCoords) { setError('Please select an origin'); return }
    if (!destCoords) { setError('Please select a destination'); return }

    setLoading(true)
    try {
      const res = await fetch(
        `${API}/api/routes?origin_lat=${originCoords.lat}&origin_lng=${originCoords.lng}&dest_lat=${destCoords.lat}&dest_lng=${destCoords.lng}`
      )
      setResults(await res.json())
    } catch {
      setError('Failed to fetch routes. Is the backend running?')
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'absolute', top: 16, left: 16, right: 16, zIndex: 8,
      background: '#fff', borderRadius: 16, padding: 14,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: '70svh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <strong style={{ fontSize: 15 }}>Plan a route</strong>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#666',
        }}>×</button>
      </div>

      <AddressInput
        label="ORIGIN"
        value={originText}
        onChange={setOriginText}
        onSelect={(s) => setOriginCoords({ lat: s.lat, lng: s.lng })}
        placeholder="Start location"
      />
      <button onClick={useMyLocation} style={{
        background: 'transparent', border: 'none', color: '#5219A7',
        fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 8,
      }}>
        Use my current location
      </button>

      <AddressInput
        label="DESTINATION"
        value={destText}
        onChange={setDestText}
        onSelect={(s) => setDestCoords({ lat: s.lat, lng: s.lng })}
        placeholder="Where to?"
      />

      <button onClick={handleSearch} disabled={loading} style={{
        width: '100%', padding: '10px', background: '#5219A7', color: '#fefbf5',
        border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', marginTop: 4,
      }}>
        {loading ? 'Searching…' : 'Find routes'}
      </button>

      {error && <div style={{ color: '#c0392b', fontSize: 12, marginTop: 8 }}>{error}</div>}

      {results?.options && (
        <div style={{ marginTop: 12 }}>
          {results.options.map((opt, i) => (
            <RouteResult key={i} option={opt} isFirst={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MapView() {
  const mapRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [userLoc, setUserLoc] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [routeOpen, setRouteOpen] = useState(false)
  const [compareFor, setCompareFor] = useState(null)
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
      {!routeOpen && <MapOverlay onOpenSearch={() => setSearchOpen(true)} />}

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

      <PlaceDetail
        place={selected}
        onClose={() => setSelected(null)}
        onDirections={() => setCompareFor(selected)}
      />

      {compareFor && (
        <CompareRoutes place={compareFor} onClose={() => setCompareFor(null)} />
      )}

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

      {routeOpen && <RoutePanel onClose={() => setRouteOpen(false)} />}

      <div className="map-fabs">
        <button
          type="button"
          className="map-fab"
          aria-label="My location"
          onClick={handleLocate}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4.5 20.5L12 17L19.5 20.5Z" transform="rotate(45 12 12)" />
          </svg>
        </button>
        <button
          type="button"
          className="map-fab map-fab--primary"
          aria-label="Plan route"
          onClick={() => setRouteOpen((v) => !v)}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
            <path d="M19 15L20.2 18.8L24 20L20.2 21.2L19 25L17.8 21.2L14 20L17.8 18.8Z" transform="scale(0.75) translate(6, 4)" />
          </svg>
        </button>
      </div>
    </div>
  )
}
