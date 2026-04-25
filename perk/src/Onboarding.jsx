import onboardingImg from './assets/onboarding.svg'
import './Onboarding.css'

function Onboarding({ onGetStarted }) {
  return (
    <div className="onboarding">
      <div className="onboarding__image">
        <img src={onboardingImg} alt="Washington Square Park" />
      </div>

      <div className="onboarding__content">
        <h1 className="onboarding__title">Violet Perks</h1>
        <p className="onboarding__subtitle">
          Navigate Smarter,
          <br />
          Discover more.
        </p>
      </div>

      <button
        type="button"
        className="onboarding__cta"
        onClick={onGetStarted}
      >
        <span>Get Started</span>
        <svg
          className="onboarding__cta-arrow"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  )
}

export default Onboarding
