import { useEffect, useState } from 'react'
import { Play, Loader2, XCircle } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { api, POLICY_COLORS, SCENARIO_LABELS } from '../api/client'

const SCENARIO_ORDER = ['easy', 'baseline', 'hard', 'extreme']

export default function StressTest() {
  const [policies, setPolicies] = useState([])
  const [selected, setSelected] = useState(new Set(['ppo_robust', 'demand_proportional']))
  const [episodes, setEpisodes] = useState(30)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.policies().then(setPolicies).catch(() => setPolicies([]))
  }, [])

  function toggle(id) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  async function run() {
    setLoading(true); setError(null); setResult(null)
    try {
      setResult(await api.stressTest({
        policies: Array.from(selected),
        episodes,
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const labelFor = id => policies.find(p => p.id === id)?.label || id

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Stress test under supply pressure</h2>
        <p className="text-sm text-gray-500 mb-5">
          Evaluate each policy at four scarcity levels, from abundant (90%) to extreme (30%).
          Robust PPO should hold up where the baselines collapse.
        </p>

        <div className="mb-5">
          <span className="text-xs font-semibold text-gray-700 mb-2 block">Policies</span>
          <div className="flex flex-wrap gap-2">
            {policies.map(p => {
              const on = selected.has(p.id)
              const color = POLICY_COLORS[p.id] || '#6B7280'
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                    on ? 'text-white' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  style={on ? { backgroundColor: color, borderColor: color } : {}}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        <label className="block w-full max-w-xs mb-5">
          <span className="text-xs font-semibold text-gray-700 mb-1.5 block">Episodes per scenario</span>
          <input
            type="number" min="5" max="500"
            value={episodes}
            onChange={e => setEpisodes(parseInt(e.target.value) || 30)}
            className="select"
          />
        </label>

        <button onClick={run} disabled={loading || selected.size === 0} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run stress test
        </button>
        {error && (
          <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
            <XCircle className="w-4 h-4" />{error}
          </p>
        )}
      </div>

      {result && <StressResults result={result} labelFor={labelFor} />}
    </div>
  )
}

function StressResults({ result, labelFor }) {
  // Group results by scenario and policy.
  const policies = Array.from(new Set(result.results.map(r => r.policy)))

  // For the reward-degradation line chart: x = scenario, one line per policy.
  const rewardData = SCENARIO_ORDER.map(s => {
    const row = { scenario: SCENARIO_LABELS[s], _key: s }
    policies.forEach(p => {
      const found = result.results.find(r => r.scenario === s && r.policy === p)
      if (found) row[p] = +found.mean_reward.toFixed(3)
    })
    return row
  })

  // For the compliance bar chart: x = scenario, grouped bars per policy.
  const complianceData = SCENARIO_ORDER.map(s => {
    const row = { scenario: SCENARIO_LABELS[s] }
    policies.forEach(p => {
      const found = result.results.find(r => r.scenario === s && r.policy === p)
      if (found) row[p] = +found.n_compliant.toFixed(2)
    })
    return row
  })

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-base font-bold text-gray-900 mb-0.5">Reward degradation curve</h3>
        <p className="text-xs text-gray-500 mb-4">
          Both policies degrade as scarcity tightens. The gap between them is the value
          of learning to adapt.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={rewardData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="scenario" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'Mean reward', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => labelFor(v)} />
            {policies.map(p => (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                stroke={POLICY_COLORS[p] || '#6B7280'}
                strokeWidth={2.5}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-bold text-gray-900 mb-0.5">Compliant feeders by scenario</h3>
        <p className="text-xs text-gray-500 mb-4">Out of 5 feeders. Higher is better.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={complianceData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="scenario" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 5]} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => labelFor(v)} />
            {policies.map(p => (
              <Bar
                key={p}
                dataKey={p}
                fill={POLICY_COLORS[p] || '#6B7280'}
                radius={[6, 6, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ScenarioGrid result={result} labelFor={labelFor} />
    </div>
  )
}

function ScenarioGrid({ result, labelFor }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {SCENARIO_ORDER.map(s => {
        const rows = result.results.filter(r => r.scenario === s)
        const sorted = [...rows].sort((a, b) => b.mean_reward - a.mean_reward)
        return (
          <div key={s} className="card p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {SCENARIO_LABELS[s]}
            </div>
            <div className="space-y-3">
              {sorted.map((r, i) => (
                <div key={r.policy} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div
                      className="text-xs font-bold leading-tight truncate"
                      style={{ color: POLICY_COLORS[r.policy] }}
                    >
                      {labelFor(r.policy)}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {r.n_compliant.toFixed(2)} / 5 compliant
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-gray-900">
                    {r.mean_reward.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
