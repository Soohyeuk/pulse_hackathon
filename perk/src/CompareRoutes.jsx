import { useEffect, useMemo, useRef, useState } from 'react'
import './CompareRoutes.css'

const TABS = [
  { id: 'subway', label: 'MTA Subway' },
  { id: 'shuttle', label: 'NYU Shuttle' },
  { id: 'walk', label: 'Walk' },
]

const SUBWAY_COLORS = {
  A: '#2850AD', C: '#2850AD', E: '#2850AD',
  B: '#FF6319', D: '#FF6319', F: '#FF6319', M: '#FF6319',
  G: '#6CBE45',
  L: '#A7A9AC',
  N: '#FCCC0A', Q: '#FCCC0A', R: '#FCCC0A', W: '#FCCC0A',
  J: '#996633', Z: '#996633',
  '1': '#EE352E', '2': '#EE352E', '3': '#EE352E',
  '4': '#00933C', '5': '#00933C', '6': '#00933C',
  '7': '#B933AD',
  S: '#808183',
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function timeFromNow(min) {
  return formatTime(new Date(Date.now() + min * 60_000))
}

function parseLines(linesStr = '') {
  return linesStr
    .split(/[\s,/]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

function caloriesFromMeters(distance_m) {
  if (!distance_m) return null
  return Math.round((distance_m / 1609) * 80)
}

// Mock numbers used in the UI in place of live schedule / distance data.
const DEFAULT_MOCK = {
  subway: {
    departsInMin: 10,
    walkToStationMi: 0.2,
    transfers: 0,
    fallbackTotal: 20,
    fallbackStation: 'West 4th St Station',
    fallbackLines: 'D,F',
  },
  shuttle: {
    departsInMin: 5,
    walkToStopMi: 0.1,
    stopName: '6 Metro Tech',
    fallbackTotal: 21,
  },
  walk: {
    fallbackTotal: 64,
    fallbackMiles: 2.8,
    fallbackKcal: 230,
  },
}

// Tandon is the Brooklyn campus — longer transit, but the NYU Shuttle
// runs Washington Square ↔ MetroTech, so shuttle is available here.
const TANDON_MOCK = {
  subway: {
    departsInMin: 6,
    walkToStationMi: 0.3,
    transfers: 1,
    fallbackTotal: 32,
    fallbackStation: 'Jay St – MetroTech',
    fallbackLines: 'A,C,F',
  },
  shuttle: {
    departsInMin: 8,
    walkToStopMi: 0.2,
    stopName: 'Washington Square',
    fallbackTotal: 25,
  },
  walk: {
    fallbackTotal: 95,
    fallbackMiles: 4.2,
    fallbackKcal: 340,
  },
}

function isTandon(place) {
  return place?.category === 'campus' && /tandon/i.test(place?.name || '')
}

export default function CompareRoutes({ place, onClose }) {
  const [tab, setTab] = useState('shuttle')
  const [loading, setLoading] = useState(true)
  const cardRefs = useRef({})

  const originLabel = 'Your location'
  const mock = isTandon(place) ? TANDON_MOCK : DEFAULT_MOCK
  const shuttleAvailable = isTandon(place)

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(t)
  }, [place])

  const byCategory = useMemo(() => ({
    subway: {
      mode: 'Walk + Subway',
      total_minutes: mock.subway.fallbackTotal,
      station: mock.subway.fallbackStation,
      lines: mock.subway.fallbackLines,
    },
    shuttle: shuttleAvailable
      ? {
          mode: 'NYU Shuttle',
          total_minutes: mock.shuttle.fallbackTotal,
          stop: mock.shuttle.stopName,
        }
      : {
          mode: 'NYU Shuttle',
          unavailable: true,
        },
    walk: {
      mode: 'Walking',
      total_minutes: mock.walk.fallbackTotal,
      distance_m: Math.round(mock.walk.fallbackMiles * 1609),
    },
  }), [mock, shuttleAvailable])

  const recommendedKey = useMemo(() => {
    let best = null
    for (const k of Object.keys(byCategory)) {
      const o = byCategory[k]
      if (!o || o.unavailable || o.total_minutes == null) continue
      if (!best || o.total_minutes < best.min) best = { key: k, min: o.total_minutes }
    }
    return best?.key
  }, [byCategory])

  // Default selected tab to the recommended option once data lands.
  useEffect(() => {
    if (recommendedKey) setTab(recommendedKey)
  }, [recommendedKey])

  // Scroll selected card into view when tab changes.
  useEffect(() => {
    const el = cardRefs.current[tab]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [tab])

  if (!place) return null

  const selectedOption = byCategory[tab]
  const selectedAvailable = selectedOption && !selectedOption.unavailable
  const selectedLabel = TABS.find((t) => t.id === tab)?.label

  return (
    <div className="cr-screen">
      <div className="cr-top">
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
            <span className="cr-od-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.4 10.6 20 3l-7.6 16.6-2-7.4-7-1.6z" />
              </svg>
            </span>
          </div>

          <div className="cr-od-divider" />
          <button type="button" className="cr-od-swap" aria-label="Swap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 4 7 20 3 16" />
              <polyline points="17 20 17 4 21 8" />
            </svg>
          </button>

          <div className="cr-od-row">
            <span className="cr-od-dot cr-od-dot--to" />
            <div className="cr-od-text">
              <span className="cr-od-label">TO</span>
              <span className="cr-od-value">{place.name}</span>
            </div>
            <span className="cr-od-action cr-od-action--chev">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
        </div>

        <div className="cr-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`cr-tab${tab === t.id ? ' cr-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cr-list">
        {loading ? (
          <div className="cr-loading">
            <div className="cr-spinner" />
            <span>Finding the best routes…</span>
          </div>
        ) : (
          <>
            <SubwayCard
              refCb={(el) => (cardRefs.current.subway = el)}
              option={byCategory.subway}
              mock={mock}
              isRecommended={recommendedKey === 'subway'}
              isSelected={tab === 'subway'}
              onClick={() => setTab('subway')}
            />
            <ShuttleCard
              refCb={(el) => (cardRefs.current.shuttle = el)}
              option={byCategory.shuttle}
              isRecommended={recommendedKey === 'shuttle'}
              isSelected={tab === 'shuttle'}
              onClick={() => setTab('shuttle')}
            />
            <WalkCard
              refCb={(el) => (cardRefs.current.walk = el)}
              option={byCategory.walk}
              isRecommended={recommendedKey === 'walk'}
              isSelected={tab === 'walk'}
              onClick={() => setTab('walk')}
            />
          </>
        )}
      </div>

      <div className="cr-footer">
        <div className="cr-footer-line">
          <span>Selected route ·</span>
          <strong className={selectedAvailable ? 'cr-footer-strong' : ''}>
            {selectedAvailable
              ? `${selectedLabel} · ${Math.round(selectedOption.total_minutes)} min`
              : `${selectedLabel} · unavailable`}
          </strong>
          <span className="cr-dots" aria-hidden="true">
            <i className={tab === 'subway' ? 'cr-dot cr-dot--on' : 'cr-dot'} />
            <i className={tab === 'shuttle' ? 'cr-dot cr-dot--on' : 'cr-dot'} />
            <i className={tab === 'walk' ? 'cr-dot cr-dot--on' : 'cr-dot'} />
          </span>
        </div>
        <button type="button" className="cr-start" disabled={loading || !selectedAvailable}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.4 10.6 20 3l-7.6 16.6-2-7.4-7-1.6z" />
          </svg>
          <span>Start Route</span>
        </button>
      </div>
    </div>
  )
}

/* ---------- cards ---------- */

function CardShell({ refCb, isRecommended, isSelected, accent, onClick, children }) {
  const cls = [
    'cr-card',
    isRecommended ? 'cr-card--recommended' : '',
    isSelected ? `cr-card--selected cr-card--accent-${accent}` : '',
  ].join(' ')

  return (
    <button type="button" ref={refCb} className={cls} onClick={onClick}>
      {isRecommended && (
        <span className="cr-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 11-13h-7z" /></svg>
          RECOMMENDED
        </span>
      )}
      {children}
    </button>
  )
}

function SubwayCard({ option, mock, isRecommended, isSelected, onClick, refCb }) {
  const lines = option ? parseLines(option.lines) : []
  const departure = option ? timeFromNow(mock.subway.departsInMin) : '—'

  return (
    <CardShell refCb={refCb} isRecommended={isRecommended} isSelected={isSelected} accent="purple" onClick={onClick}>
      <div className="cr-card-head">
        <span className="cr-card-icon cr-card-icon--subway">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="14" rx="3" />
            <line x1="4" y1="13" x2="20" y2="13" />
            <circle cx="8.5" cy="16" r="1" />
            <circle cx="15.5" cy="16" r="1" />
            <path d="M7 21l2-3M17 21l-2-3" />
          </svg>
        </span>
        <div className="cr-card-titleblock">
          <strong>MTA Subway</strong>
          <span className="cr-card-sub">{option ? `Via ${option.station || 'subway'}` : 'No route found'}</span>
        </div>
        <div className="cr-card-time">
          <strong>{option ? Math.round(option.total_minutes) : '—'}</strong>
          <span>min</span>
        </div>
      </div>

      {option && (
        <>
          <div className="cr-row-info">
            <span className="cr-line-bullets">
              {lines.length > 0
                ? lines.map((l) => (
                    <span key={l} className="cr-line-bullet" style={{ background: SUBWAY_COLORS[l] || '#5219A7' }}>
                      {l}
                    </span>
                  ))
                : <span className="cr-line-bullet" style={{ background: '#5219A7' }}>•</span>}
            </span>
            <span className="cr-row-info-label">{lines.length > 0 ? `${lines.join('·')} line` : 'Subway'}</span>
            <span className="cr-row-info-meta">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="7 4 7 20 3 16" />
                <polyline points="17 20 17 4 21 8" />
              </svg>
              {mock.subway.transfers} transfer
            </span>
          </div>

          <div className="cr-row-foot">
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
              </svg>
              Departs {departure}
            </span>
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              {mock.subway.walkToStationMi} mi walk to station
            </span>
          </div>
        </>
      )}
    </CardShell>
  )
}

function ShuttleCard({ option, isRecommended, isSelected, onClick, refCb }) {
  const isUnavailable = !option || option.unavailable

  return (
    <CardShell refCb={refCb} isRecommended={isRecommended && !isUnavailable} isSelected={isSelected} accent="green" onClick={onClick}>
      <div className="cr-card-head">
        <span className="cr-card-icon cr-card-icon--shuttle">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="18" height="11" rx="2" />
            <line x1="3" y1="13" x2="21" y2="13" />
            <circle cx="7" cy="19" r="1.5" />
            <circle cx="17" cy="19" r="1.5" />
          </svg>
        </span>
        <div className="cr-card-titleblock">
          <strong>NYU Shuttle</strong>
          <span className="cr-card-sub">
            {isUnavailable ? 'Not running on this route' : 'Free for NYU students'}
          </span>
        </div>
        <div className="cr-card-time">
          {isUnavailable ? (
            <span className="cr-unavail">Unavailable</span>
          ) : (
            <>
              <strong>{Math.round(option.total_minutes)}</strong>
              <span>min</span>
            </>
          )}
        </div>
      </div>
    </CardShell>
  )
}

function WalkCard({ option, isRecommended, isSelected, onClick, refCb }) {
  const arrivesAt = option ? timeFromNow(option.total_minutes) : '—'
  const miles = option?.distance_m ? (option.distance_m / 1609).toFixed(1) : null
  const kcal = option?.distance_m ? caloriesFromMeters(option.distance_m) : null

  return (
    <CardShell refCb={refCb} isRecommended={isRecommended} isSelected={isSelected} accent="purple" onClick={onClick}>
      <div className="cr-card-head">
        <span className="cr-card-icon cr-card-icon--walk">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4c1 0 2 1 2 2 0 1.5-1 4-2 5 1 0 2 1 2 3l-1 6" />
            <path d="M15 4c1 0 2 1 2 2 0 1.5-1 4-2 5 1 0 2 1 2 3l-1 6" />
          </svg>
        </span>
        <div className="cr-card-titleblock">
          <strong>Walk</strong>
          <span className="cr-card-sub">{option ? 'Direct route' : 'No route found'}</span>
        </div>
        <div className="cr-card-time">
          <strong>{option ? Math.round(option.total_minutes) : '—'}</strong>
          <span>min</span>
        </div>
      </div>

      {option && (
        <>
          <div className="cr-meta-grid">
            <div className="cr-meta-cell">
              <span className="cr-meta-label">DISTANCE</span>
              <span className="cr-meta-value">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {miles ? `${miles} miles` : '—'}
              </span>
            </div>
            <div className="cr-meta-cell">
              <span className="cr-meta-label">ARRIVAL</span>
              <span className="cr-meta-value">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
                </svg>
                {arrivesAt}
              </span>
            </div>
            <div className="cr-meta-cell">
              <span className="cr-meta-label">CALORIES</span>
              <span className="cr-meta-value">{kcal ? `~${kcal} kcal` : '—'}</span>
            </div>
          </div>

          <div className="cr-progress">
            <span className="cr-progress-bar" style={{ width: '70%' }} />
            <svg className="cr-progress-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </div>
        </>
      )}
    </CardShell>
  )
}
