import { useEffect, useState } from 'react'
import { Play, Loader2, XCircle, Trophy } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { api, POLICY_COLORS, BAND_COLORS } from '../api/client'

export default function Compare() {
  const [policies, setPolicies] = useState([])
  const [selected, setSelected] = useState(new Set(['ppo_robust', 'demand_proportional', 'equal_split', 'priority_based']))
  const [scarcity, setScarcity] = useState(0.7)
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
      setResult(await api.compare({
        policies: Array.from(selected),
        scarcity,
        shortage_prob: 0.05,
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
        <h2 className="text-xl font-bold text-gray-900 mb-1">Compare policies head-to-head</h2>
        <p className="text-sm text-gray-500 mb-5">
          Run each selected policy for N episodes and aggregate the results.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div>
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
                      on
                        ? 'text-white'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={on ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Scarcity: {scarcity.toFixed(2)}
              </span>
              <input
                type="range" min="0.3" max="1.0" step="0.05"
                value={scarcity}
                onChange={e => setScarcity(parseFloat(e.target.value))}
                className="w-full accent-brand-blue-600"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700 mb-1.5 block">Episodes</span>
              <input
                type="number" min="5" max="500"
                value={episodes}
                onChange={e => setEpisodes(parseInt(e.target.value) || 30)}
                className="select"
              />
            </label>
          </div>
        </div>

        <button onClick={run} disabled={loading || selected.size === 0} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run comparison
        </button>
        {error && (
          <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
            <XCircle className="w-4 h-4" />{error}
          </p>
        )}
      </div>

      {result && <ComparisonResults result={result} labelFor={labelFor} />}
    </div>
  )
}

function ComparisonResults({ result, labelFor }) {
  const sorted = [...result.results].sort((a, b) => b.mean_reward - a.mean_reward)
  const winner = sorted[0]

  const chartData = sorted.map(r => ({
    policy: labelFor(r.policy),
    id: r.policy,
    reward: +r.mean_reward.toFixed(3),
    compliant: +r.n_compliant.toFixed(2),
    fairness: +r.fairness.toFixed(3),
    unserved: +r.total_unserved_MWh.toFixed(2),
  }))

  return (
    <div className="space-y-6">
      {/* Winner banner */}
      <div className="card p-5 bg-gradient-to-r from-brand-green-50 via-white to-brand-blue-50 border-brand-green-100">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-green-600 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold text-brand-green-700 uppercase tracking-wide">
              Best by mean reward
            </div>
            <div className="text-lg font-bold text-gray-900">
              {labelFor(winner.policy)} &middot; reward {winner.mean_reward.toFixed(2)} &middot; {winner.n_compliant.toFixed(2)} / 5 compliant
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Mean episode reward" subtitle="Higher is better">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 50, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="policy" tick={{ fontSize: 11 }} width={130} />
              <Tooltip />
              <Bar dataKey="reward" radius={[0, 6, 6, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={POLICY_COLORS[d.id] || '#6B7280'} />
                ))}
                <LabelList dataKey="reward" position="right" style={{ fontSize: 11, fill: '#374151' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Compliant feeders (out of 5)" subtitle="Demand met across all bands">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 50, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 5]} />
              <YAxis type="category" dataKey="policy" tick={{ fontSize: 11 }} width={130} />
              <Tooltip />
              <Bar dataKey="compliant" radius={[0, 6, 6, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={POLICY_COLORS[d.id] || '#6B7280'} />
                ))}
                <LabelList dataKey="compliant" position="right" style={{ fontSize: 11, fill: '#374151' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Per-feeder compliance heatmap-ish view */}
      <ChartCard title="Per-feeder compliance rate by policy" subtitle="Each cell is the fraction of episodes that feeder met its committed hours">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left font-semibold py-2 pr-3">Policy</th>
                {result.feeder_names.map((name, i) => (
                  <th key={name} className="px-2 py-2 font-semibold">
                    <div
                      className="inline-flex w-6 h-6 rounded-md items-center justify-center text-white text-xs"
                      style={{ backgroundColor: BAND_COLORS[result.bands[i]] }}
                    >
                      {result.bands[i]}
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 font-semibold text-right">Reward</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.policy} className="border-b border-gray-50">
                  <td className="py-2.5 pr-3 font-medium text-gray-900">{labelFor(r.policy)}</td>
                  {r.per_feeder_compliance.map((rate, i) => (
                    <td key={i} className="px-2 py-2.5 text-center">
                      <ComplianceCell rate={rate} />
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                    {r.mean_reward.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

function ComplianceCell({ rate }) {
  // Interpolate from gray (0.0) through blue (0.5) to green (1.0).
  const r = Math.round(229 + (16 - 229) * rate)
  const g = Math.round(231 + (185 - 231) * rate)
  const b = Math.round(235 + (129 - 235) * rate)
  return (
    <div
      className="inline-block w-12 h-7 rounded-md text-xs font-semibold flex items-center justify-center"
      style={{
        backgroundColor: `rgb(${r}, ${g}, ${b})`,
        color: rate > 0.5 ? 'white' : '#374151',
      }}
    >
      {(rate * 100).toFixed(0)}%
    </div>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card p-6">
      <h3 className="text-base font-bold text-gray-900 mb-0.5">{title}</h3>
      <p className="text-xs text-gray-500 mb-4">{subtitle}</p>
      {children}
    </div>
  )
}
