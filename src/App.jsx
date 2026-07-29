import { useEffect, useState } from 'react'
import { useApp } from './state/AppContext.jsx'
import TabBar from './components/TabBar.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Today from './screens/Today.jsx'
import Build from './screens/Build.jsx'
import Plan from './screens/Plan.jsx'
import Session from './screens/Session.jsx'
import History from './screens/History.jsx'

/**
 * Routing is a single piece of state rather than a router library.
 * Four tabs and one detail screen doesn't justify the dependency, and a
 * Capacitor WebView has no real URL bar to sync with anyway.
 */
export default function App() {
  const { state } = useApp()
  const [route, setRoute] = useState('today')
  const [params, setParams] = useState({})

  // Reset scroll after the new screen renders. Must sit above the onboarding
  // return so the hook order stays identical once onboarding completes.
  useEffect(() => {
    document.querySelector('.scroll')?.scrollTo({ top: 0 })
  }, [route])

  if (!state.onboarded) return <Onboarding />

  function navigate(next, nextParams = {}) {
    setRoute(next)
    setParams(nextParams)
  }

  const screens = {
    today: <Today onNavigate={navigate} />,
    build: <Build onNavigate={navigate} />,
    plan: <Plan planId={params.planId} onNavigate={navigate} />,
    session: <Session planId={params.planId} dayId={params.dayId} onNavigate={navigate} />,
    history: <History onNavigate={navigate} />,
  }

  // The session screen is a detail view, so it highlights the tab it came from.
  const activeTab = route === 'session' ? 'plan' : route

  return (
    <div className="shell">
      {screens[route] ?? screens.today}
      <TabBar route={activeTab} onNavigate={(r) => navigate(r)} />
    </div>
  )
}
