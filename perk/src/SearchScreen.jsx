import { useEffect, useMemo, useRef, useState } from 'react'
import './SearchScreen.css'

const RECENT_KEY = 'perk:recent'

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function SearchScreen({ benefits, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState(loadRecent)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return benefits
      .filter((b) =>
        (b.name + ' ' + b.description + ' ' + b.address).toLowerCase().includes(q)
      )
      .slice(0, 12)
  }, [query, benefits])

  const list = query.trim() ? matches : recent

  const handlePick = (item) => {
    const next = [item, ...recent.filter((r) => r.id !== item.id)].slice(0, 8)
    setRecent(next)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
    onSelect(item)
  }

  const clearAll = () => {
    setRecent([])
    try { localStorage.removeItem(RECENT_KEY) } catch {}
  }

  return (
    <div className="search-screen">
      <div className="search-screen__bar">
        <button type="button" className="search-screen__back" onClick={onClose} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="text"
          className="search-screen__input"
          placeholder="Where do you want to go?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && list[0]) handlePick(list[0])
          }}
        />
        {query && (
          <button
            type="button"
            className="search-screen__clear"
            aria-label="Clear"
            onClick={() => setQuery('')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="search-screen__section-head">
        <span className="search-screen__section-title">
          {query.trim() ? 'RESULTS' : 'RECENT'}
        </span>
        {!query.trim() && recent.length > 0 && (
          <button type="button" className="search-screen__clear-all" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      <ul className="search-screen__list">
        {list.length === 0 && (
          <li className="search-screen__empty">
            {query.trim() ? 'No matches' : 'Search for places, benefits, or destinations'}
          </li>
        )}
        {list.map((b, i) => (
          <li key={b.id ?? i}>
            <button
              type="button"
              className={`search-row${i === 0 && !query.trim() && list.length > 0 ? ' search-row--highlight' : ''}`}
              onClick={() => handlePick(b)}
            >
              <span className="search-row__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 14" />
                </svg>
              </span>
              <span className="search-row__text">
                <span className="search-row__title">{b.name}</span>
                <span className="search-row__subtitle">Place</span>
              </span>
              {b.discount && <span className="search-row__badge">Benefit</span>}
              <span className="search-row__arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
