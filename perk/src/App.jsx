import { useState } from 'react'
import MapView from './Map'
import Onboarding from './Onboarding'

function App() {
  const [screen, setScreen] = useState('onboarding')

  if (screen === 'onboarding') {
    return <Onboarding onGetStarted={() => setScreen('map')} />
  }

  return <MapView />
}

export default App
