import './PlaceDetail.css'

const CATEGORY_LABEL = {
  restaurant: 'Restaurant',
  museum: 'Museum',
  cafe: 'Cafe',
  clothing: 'Clothing',
  culture: 'Culture',
}

export default function PlaceDetail({ place, onClose, onDirections }) {
  if (!place) return null

  return (
    <div className="place-detail" role="dialog" aria-label={place.name}>
      <button
        type="button"
        className="place-detail__handle"
        aria-label="Close"
        onClick={onClose}
      >
        <span />
      </button>

      <div className="place-detail__header">
        <div className="place-detail__title-block">
          <h2 className="place-detail__title">{place.name}</h2>
          <div className="place-detail__rating">
            <strong>4.7</strong>
            <span className="place-detail__stars" aria-hidden="true">★★★★★</span>
            <span className="place-detail__reviews">(2,341 reviews)</span>
          </div>
          <div className="place-detail__address">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{place.address}</span>
          </div>
          <div className="place-detail__status">
            <span className={`place-detail__open-dot${place.open === false ? ' place-detail__open-dot--closed' : ''}`} />
            <span className={place.open === false ? 'place-detail__closed' : 'place-detail__open'}>
              {place.open === false ? 'Closed' : 'Open now'}
            </span>
            <span className="place-detail__hours-inline">· {place.hours || 'Open 24 hours'}</span>
          </div>
        </div>

        <div className="place-detail__badge">
          <span>NYU</span>
          <span>{CATEGORY_LABEL[place.category] || place.category}</span>
        </div>
      </div>

      <div className="place-detail__divider" />

      <div className="place-detail__actions">
        <ActionButton label="Directions" onClick={onDirections}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l18-8-8 18-2-8z" />
          </svg>
        </ActionButton>
        <ActionButton label="Save">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </ActionButton>
        <ActionButton label="Call" color="#22a06b">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </ActionButton>
        <ActionButton label="Website" color="#f59e0b">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </ActionButton>
      </div>

      {place.discount && (
        <div className="place-detail__perk">
          <div className="place-detail__perk-label">Your perk</div>
          <div className="place-detail__perk-value">{place.discount}</div>
        </div>
      )}

      <p className="place-detail__desc">{place.description}</p>
    </div>
  )
}

function ActionButton({ label, children, color = '#5219A7', onClick }) {
  return (
    <button type="button" className="place-action" onClick={onClick}>
      <span className="place-action__icon" style={{ color }}>{children}</span>
      <span className="place-action__label">{label}</span>
    </button>
  )
}
