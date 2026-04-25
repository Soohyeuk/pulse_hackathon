import { useEffect, useMemo, useState } from 'react'
import './CompareRoutes.css'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const TABS = ['All', 'Subway', 'Walk', 'Shuttle']

function modeMatchesTab(mode = '', tab) {
  const m = mode.toLowerCase()
  if (tab === 'All') return true
  if (tab === 'Subway') return m.includes('subway')
  if (tab === 'Walk') return m.includes('walk') && !m.includes('subway')
  if (tab === 'Shuttle') return m.includes('shuttle')
  return true
}

function modeIcon(mode = '') {
  const m = mode.toLowerCase()
  if (m.includes('subway')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="14" rx="3" />
        <line x1="4" y1="13" x2="20" y2="13" />
        <circle cx="8.5" cy="16" r="1" />
        <circle cx="15.5" cy="16" r="1" />
        <path d="M7 21l2-3M17 21l-2-3" />
      </svg>
    )
  }
  if (m.includes('shuttle') || m.includes('bus')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="11" rx="2" />
        <line x1="3" y1="13" x2="21" y2="13" />
        <circle cx="7" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </svg>
    )
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4l-2 4 4 2-2 4 3 6" />
      <circle cx="14" cy="4" r="1.5" />
    </svg>
  )
}

function formatTimeFromNow(min) {
  const d = new Date(Date.now() + min * 60000)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function CompareRoutes({ place, onClose }) {
  const [origin, setOrigin] = useState(null)
  const [originLabel, setOriginLabel] = useState('Your location')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('All')
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setError('Unable to get location. Using NYU as origin.')
        setOrigin({ lat: 40.7295, lng: -73.9965 })
        setOriginLabel('NYU Washington Square')
      },
      { enableHighAccuracy: true }
    )
  }, [])

  useEffect(() => {
    if (!origin || !place) return
    const dest = place.coordinates
    setLoading(true)
    setError(null)
    fetch(
      `${API}/api/routes?origin_lat=${origin.lat}&origin_lng=${origin.lng}&dest_lat=${dest.lat}&dest_lng=${dest.lng}`
    )
      .then((r) => {
        if (!r.ok) throw new Error('bad status')
        return r.json()
      })
      .then((d) => {
        setData(d)
        setSelectedIdx(0)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not fetch routes. Is the backend running?')
        setLoading(false)
      })
  }, [origin, place])

  const filtered = useMemo(() => {
    if (!data?.options) return []
    return data.options
      .map((o, i) => ({ ...o, _idx: i }))
      .filter((o) => modeMatchesTab(o.mode, tab))
  }, [data, tab])

  if (!place) return null

  const recommendedIdx = 0 // backend already sorts by total_minutes; index 0 of full list
  const selectedOption = data?.options?.[selectedIdx]

  return (
    <div className="cr-screen">
      <div className="cr-header">
        <button type="button" className="cr-back" onClick={onClose} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h2 className="cr-title">Compare Routes</h2>
      </div>

      <div className="cr-od">
        <div className="cr-od-row">
          <span className="cr-od-dot cr-od-dot--from" />
          <div className="cr-od-text">
            <span className="cr-od-label">FROM</span>
            <span className="cr-od-value">{originLabel}</span>
          </div>
          <button className="cr-od-action" aria-label="Locate" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.4 10.6 20 3l-7.6 16.6-2-7.4-7-1.6z" />
            </svg>
          </button>
        </div>
        <div className="cr-od-divider">
          <button className="cr-od-swap" type="button" aria-label="Swap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 4 7 20 3 16" />
              <polyline points="17 20 17 4 21 8" />
            </svg>
          </button>
        </div>
        <div className="cr-od-row">
          <span className="cr-od-dot cr-od-dot--to" />
          <div className="cr-od-text">
            <span className="cr-od-label">TO</span>
            <span className="cr-od-value">{place.name}</span>
          </div>
        </div>
      </div>

      <div className="cr-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`cr-tab${tab === t ? ' cr-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="cr-list">
        {loading && <div className="cr-empty">Finding routes…</div>}
        {error && !loading && <div className="cr-empty">{error}</div>}
        {!loading && filtered.length === 0 && !error && (
          <div className="cr-empty">No options for this filter.</div>
        )}

        {filtered.map((opt) => {
          const isRecommended = opt._idx === recommendedIdx
          const isSelected = selectedIdx === opt._idx
          return (
            <button
              key={opt._idx}
              type="button"
              className={`cr-card${isRecommended ? ' cr-card--recommended' : ''}${isSelected ? ' cr-card--selected' : ''}`}
              onClick={() => setSelectedIdx(opt._idx)}
            >
              {isRecommended && <span className="cr-badge">RECOMMENDED</span>}

              <div className="cr-card-head">
                <span className="cr-card-icon">{modeIcon(opt.mode)}</span>
                <div className="cr-card-titleblock">
                  <strong>{opt.mode}</strong>
                  <span className="cr-card-sub">
                    {opt.station ? `Via ${opt.station}` : opt.distance_m ? `${(opt.distance_m / 1609).toFixed(1)} mi direct` : 'Direct route'}
                  </span>
                </div>
                <div className="cr-card-time">
                  <strong>{Math.round(opt.total_minutes)}</strong>
                  <span>min</span>
                </div>
              </div>

              <div className="cr-card-meta">
                <div className="cr-meta-cell">
                  <span className="cr-meta-label">NEXT</span>
                  <span className="cr-meta-value">{formatTimeFromNow(2)}</span>
                </div>
                <div className="cr-meta-cell">
                  <span className="cr-meta-label">ARRIVES</span>
                  <span className="cr-meta-value">{formatTimeFromNow(opt.total_minutes)}</span>
                </div>
                {opt.lines && (
                  <div className="cr-meta-cell">
                    <span className="cr-meta-label">LINES</span>
                    <span className="cr-meta-value">{opt.lines}</span>
                  </div>
                )}
                {opt.distance_m && !opt.lines && (
                  <div className="cr-meta-cell">
                    <span className="cr-meta-label">DISTANCE</span>
                    <span className="cr-meta-value">{(opt.distance_m / 1609).toFixed(1)} mi</span>
                  </div>
                )}
              </div>

              <ul className="cr-segments">
                {opt.segments?.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      <div className="cr-footer">
        <div className="cr-selected-line">
          Selected route ·{' '}
          <strong>
            {selectedOption ? `${selectedOption.mode} · ${Math.round(selectedOption.total_minutes)} min` : '—'}
          </strong>
        </div>
        <button type="button" className="cr-start" disabled={!selectedOption}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.4 10.6 20 3l-7.6 16.6-2-7.4-7-1.6z" />
          </svg>
          <span>Start Route</span>
        </button>
      </div>
    </div>
  )
}
