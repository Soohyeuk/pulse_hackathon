import { useState, useRef, useCallback } from 'react'
import { Map, Marker, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

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
      const res = await fetch(`${API}/api/geocode/suggest?query=${encodeURIComponent(q)}`)
      setSuggestions(await res.json())
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
            }}
              onMouseEnter={e => e.target.style.background = '#f5f5f5'}
              onMouseLeave={e => e.target.style.background = '#fff'}
            >
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
        <span style={{
          fontWeight: 700, fontSize: 14, color: isFirst ? '#3b82f6' : '#333',
        }}>{option.total_minutes} min</span>
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

export default function MapView() {
  const [originText, setOriginText] = useState('')
  const [destText, setDestText] = useState('')
  const [originCoords, setOriginCoords] = useState(null)
  const [destCoords, setDestCoords] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [markers, setMarkers] = useState({ origin: null, dest: null })

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setOriginCoords(coords)
        setOriginText('My Current Location')
        setMarkers(m => ({ ...m, origin: coords }))
      },
      () => setError('Could not get your location')
    )
  }

  const handleSearch = async () => {
    setError(null)
    setResults(null)

    const origin = originCoords
    const dest = destCoords

    if (!origin) { setError('Please select an origin'); return }
    if (!dest) { setError('Please select a destination'); return }

    setLoading(true)
    try {
      const res = await fetch(
        `${API}/api/routes?origin_lat=${origin.lat}&origin_lng=${origin.lng}&dest_lat=${dest.lat}&dest_lng=${dest.lng}`
      )
      const data = await res.json()
      setResults(data)
      setMarkers({ origin, dest })
    } catch {
      setError('Failed to fetch routes. Is the backend running?')
    }
    setLoading(false)
  }

  if (!TOKEN) return <div style={{ padding: 16 }}>Missing VITE_MAPBOX_TOKEN in .env</div>

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Map
        mapboxAccessToken={TOKEN}
        initialViewState={{ longitude: NYU.lng, latitude: NYU.lat, zoom: 14 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        {markers.origin && <Marker longitude={markers.origin.lng} latitude={markers.origin.lat} color="#22c55e" />}
        {markers.dest && <Marker longitude={markers.dest.lng} latitude={markers.dest.lat} color="#ef4444" />}
      </Map>

      {/* Route Panel */}
      <div style={{
        position: 'absolute', top: 16, left: 16, width: 300,
        background: '#fff', borderRadius: 14, padding: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 10,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Find Your Route</div>

        <AddressInput
          label="FROM"
          value={originText}
          onChange={setOriginText}
          onSelect={(s) => { setOriginCoords(s); setMarkers(m => ({ ...m, origin: s })) }}
          placeholder="Enter starting point..."
        />

        <button onClick={useMyLocation} style={{
          width: '100%', padding: '7px', marginBottom: 8, background: '#f0f7ff',
          border: '1px solid #3b82f6', borderRadius: 8, color: '#3b82f6',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Use My Current Location
        </button>

        <AddressInput
          label="TO"
          value={destText}
          onChange={setDestText}
          onSelect={(s) => { setDestCoords(s); setMarkers(m => ({ ...m, dest: s })) }}
          placeholder="Enter destination..."
        />

        <button onClick={handleSearch} disabled={loading} style={{
          width: '100%', padding: '10px', background: '#57068c',
          border: 'none', borderRadius: 8, color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, marginTop: 4,
        }}>
          {loading ? 'Searching...' : 'Compare Routes'}
        </button>

        {error && (
          <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{error}</div>
        )}

        {results && results.options.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              {results.origin.name?.split(',')[0]} → {results.destination.name?.split(',')[0]}
            </div>
            {results.options.map((opt, i) => (
              <RouteResult key={i} option={opt} isFirst={i === 0} />
            ))}
          </div>
        )}

        {results && results.options.length === 0 && (
          <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>No routes found.</div>
        )}
      </div>
    </div>
  )
}
