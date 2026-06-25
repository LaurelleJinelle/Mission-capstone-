import { useEffect, useState } from 'react'
import { Play, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceArea, BarChart, Bar, Cell,
} from 'recharts'
import { api, BAND_COLORS } from '../api/client'

export default function Simulator() {
  const [policies, setPolicies] = useState([])
  const [feeders, setFeeders] = useState([])
  const [form, setForm] = useState({
    policy: 'ppo_robust',
    scarcity: 0.7,
    shortage_prob: 0.05,
    seed: 0,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.policies().then(setPolicies).catch(() => setPolicies([]))
    api.feeders().then(setFeeders).catch(() => setFeeders([]))
  }, [])

  // Choose a sensible default policy once the available list loads.
  useEffect(() => {
    if (!policies.length) return
    const ids = policies.map(p => p.id)
    if (!ids.includes(form.policy)) {
      setForm(f => ({ ...f, policy: ids[0] }))
    }
  }, [policies])

  async function run() {
    setLoading(true); setError(null); setResult(null)
    try {
      setResult(await api.simulate(form))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Run a 24-hour simulation</h2>
        <p className="text-sm text-gray-500 mb-5">
          Watch a single day play out hour by hour for any policy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Policy">
            <select
              value={form.policy}
              onChange={e => setForm({ ...form, policy: e.target.value })}
              className="select"
            >
              {policies.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label={`Scarcity: ${form.scarcity.toFixed(2)}`}>
            <input
              type="range"
              min="0.3" max="1.0" step="0.05"
              value={form.scarcity}
              onChange={e => setForm({ ...form, scarcity: parseFloat(e.target.value) })}
              className="w-full accent-brand-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>tight</span><span>abundant</span>
            </div>
          </Field>
          <Field label={`Shortage probability: ${form.shortage_prob.toFixed(2)}`}>
            <input
              type="range"
              min="0" max="0.3" step="0.01"
              value={form.shortage_prob}
              onChange={e => setForm({ ...form, shortage_prob: parseFloat(e.target.value) })}
              className="w-full accent-brand-purple-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>stable</span><span>volatile</span>
            </div>
          </Field>
          <Field label="Seed">
            <input
              type="number"
              value={form.seed}
              onChange={e => setForm({ ...form, seed: parseInt(e.target.value) || 0 })}
              className="select"
            />
          </Field>
        </div>

        <button
          onClick={run}
          disabled={loading || !form.policy}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue-600 hover:bg-brand-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-card transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run simulation
        </button>
        {error && (
          <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
            <XCircle className="w-4 h-4" />{error}
          </p>
        )}
      </div>

      {result && <Results result={result} feeders={feeders} />}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700 mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}

function Results({ result, feeders }) {
  // Build chart-ready data from the hourly array.
  const hourlyData = result.hourly.map(h => ({
    hour: h.hour,
    Demand: +h.total_demand.toFixed(3),
    Supply: +h.supply.toFixed(3),
    Delivered: +h.total_delivered.toFixed(3),
    shortage: h.is_shortage,
  }))

  const shortageHours = result.hourly
    .filter(h => h.is_shortage)
    .map(h => h.hour)

  const perFeeder = result.feeder_names.map((name, i) => ({
    name,
    band: result.bands[i],
    short: name.slice(0, 18),
    served: +result.hours_served[i].toFixed(2),
    committed: result.committed_hours[i],
    compliant: result.hours_served[i] >= result.committed_hours[i],
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total reward" value={result.total_reward.toFixed(2)} accent="blue" />
        <Kpi
          label="Compliant feeders"
          value={`${result.compliant_feeders} / 5`}
          accent={result.compliant_feeders === 5 ? 'green' : result.compliant_feeders >= 3 ? 'blue' : 'amber'}
          icon={result.compliant_feeders === 5 ? CheckCircle : null}
        />
        <Kpi label="Delivered (MWh)" value={result.total_delivered_MWh.toFixed(1)} accent="green" />
        <Kpi label="Unserved (MWh)" value={result.total_unserved_MWh.toFixed(1)} accent="purple" />
      </div>

      <div className="card p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Hourly demand, supply and delivered</h3>
        <p className="text-xs text-gray-500 mb-4">
          Shaded bands mark hours flagged as supply shortages.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={hourlyData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} label={{ value: 'Hour of day', position: 'insideBottom', offset: -5, style: { fontSize: 11 } }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'MWh / hour', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {shortageHours.map(h => (
              <ReferenceArea key={h} x1={h - 0.5} x2={h + 0.5} fill="#FEF3C7" fillOpacity={0.5} />
            ))}
            <Line type="monotone" dataKey="Demand"    stroke="#9333EA" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Supply"    stroke="#2563EB" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Delivered" stroke="#059669" strokeWidth={2.5} strokeDasharray="4 2" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Hours served vs commitment</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perFeeder} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="short" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="committed" fill="#E5E7EB" name="Committed" />
              <Bar dataKey="served" name="Served">
                {perFeeder.map((row, i) => (
                  <Cell key={i} fill={BAND_COLORS[row.band] || '#6B7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Per-feeder compliance</h3>
          <div className="space-y-2">
            {perFeeder.map(row => (
              <div key={row.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: BAND_COLORS[row.band] }}
                  >
                    {row.band}
                  </div>
                  <span className="text-sm text-gray-900 truncate" title={row.name}>{row.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-xs text-gray-500 tabular-nums">
                    {row.served} / {row.committed} hrs
                  </span>
                  {row.compliant
                    ? <CheckCircle className="w-4 h-4 text-brand-green-600" />
                    : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, accent, icon: Icon }) {
  const colorMap = {
    blue:   'text-brand-blue-700',
    green:  'text-brand-green-700',
    purple: 'text-brand-purple-700',
    amber:  'text-amber-700',
  }
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold ${colorMap[accent]} mt-1 flex items-center gap-2`}>
        {value}
        {Icon && <Icon className="w-5 h-5" />}
      </div>
    </div>
  )
}
