import { useState } from 'react'
import './MapOverlay.css'

const CATEGORIES = [
  {
    id: 'culture',
    label: 'Culture',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: 'food',
    label: 'Food',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 3v8a3 3 0 0 0 3 3v7" />
        <path d="M10 3v8a3 3 0 0 1-3 3" />
        <path d="M7 3v8" />
        <path d="M17 3c-1.5 1.5-2 3-2 5s.5 3.5 2 5v8" />
      </svg>
    ),
  },
  {
    id: 'cafe',
    label: 'Cafe',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8h14v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
        <path d="M17 10h2a2 2 0 0 1 0 4h-2" />
        <path d="M7 4c0 1 1 1 1 2s-1 1-1 2" />
        <path d="M11 4c0 1 1 1 1 2s-1 1-1 2" />
      </svg>
    ),
  },
  {
    id: 'clothing',
    label: 'Clothing',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3l4 3 4-3 5 4-3 4-2-1v11H6V10L4 11 1 7z" />
      </svg>
    ),
  },
]

export default function MapOverlay({ initials = 'VP', onOpenSearch }) {
  const [active, setActive] = useState(null)

  return (
    <div className="map-overlay">
      <button type="button" className="search-bar" onClick={onOpenSearch}>
        <div className="search-bar__avatar">{initials}</div>
        <span className="search-bar__placeholder">
          Search places, benefits, or destinations
        </span>
        <span className="search-bar__action" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
      </button>

      <div className="category-row">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`category-chip${active === c.id ? ' category-chip--active' : ''}`}
            onClick={() => setActive(c.id)}
          >
            {c.icon}
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
