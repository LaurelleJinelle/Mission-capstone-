import { useEffect, useState } from 'react'
import { Zap, Activity, BarChart3, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from './api/client'
import Overview from './pages/Overview'
import Simulator from './pages/Simulator'
import Compare from './pages/Compare'
import StressTest from './pages/StressTest'

const TABS = [
  { id: 'overview',  label: 'Overview',         icon: Zap },
  { id: 'simulator', label: 'Live Simulation',  icon: Activity },
  { id: 'compare',   label: 'Compare Policies', icon: BarChart3 },
  { id: 'stress',    label: 'Stress Test',      icon: AlertTriangle },
]

export default function App() {
  const [tab, setTab] = useState('overview')
  const [health, setHealth] = useState({ status: 'checking' })

  useEffect(() => {
    api.health()
      .then(r => setHealth({ status: 'ok', models: r.models_loaded }))
      .catch(() => setHealth({ status: 'down' }))
  }, [])

  if (health.status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-blue-600 animate-spin" />
      </div>
    )
  }

  if (health.status === 'down') {
    return <BackendDownScreen />
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue-600 to-brand-purple-600 flex items-center justify-center shadow-card">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Smart Grid</h1>
                <p className="text-xs text-gray-500">IKEDC adaptive allocation dashboard</p>
              </div>
            </div>
            <nav className="flex gap-1 bg-gray-50 rounded-xl p-1">
              {TABS.map(t => {
                const Icon = t.icon
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${active
                        ? 'bg-white text-brand-blue-700 shadow-card'
                        : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'overview'  && <Overview />}
        {tab === 'simulator' && <Simulator />}
        {tab === 'compare'   && <Compare />}
        {tab === 'stress'    && <StressTest />}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-6 text-xs text-gray-400 text-center">
        Models loaded: <span className="font-mono">{(health.models || []).join(', ') || 'none'}</span>
      </footer>
    </div>
  )
}

function BackendDownScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card p-8 max-w-md text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Backend not reachable</h2>
        <p className="text-sm text-gray-600 mb-4">
          The dashboard could not connect to the FastAPI server at <code>http://localhost:8000</code>.
        </p>
        <p className="text-xs text-gray-500">
          From <code>dashboard/backend/</code>, run:<br />
          <code className="block mt-2 p-2 bg-gray-50 rounded text-left">
            uvicorn app:app --reload --port 8000
          </code>
        </p>
      </div>
    </div>
  )
}
