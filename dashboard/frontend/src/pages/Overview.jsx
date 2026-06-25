import { useEffect, useState } from 'react'
import { Zap, CheckCircle, Award, TrendingUp, Loader2 } from 'lucide-react'
import { api, BAND_COLORS } from '../api/client'

export default function Overview() {
  const [feeders, setFeeders] = useState(null)

  useEffect(() => {
    api.feeders().then(setFeeders).catch(() => setFeeders([]))
  }, [])

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="card p-8 bg-gradient-to-br from-brand-blue-50 via-white to-brand-purple-50">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-brand-blue-100 text-brand-blue-700 text-xs font-semibold mb-4">
            <Zap className="w-3.5 h-3.5" />
            Adaptive Smart Grid Energy Allocation
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
            A reinforcement learning agent that allocates electricity across IKEDC feeders.
          </h2>
          <p className="text-gray-600 leading-relaxed">
            This dashboard runs your trained PPO models live against the same simulator used during
            training. Pick a policy, run a 24-hour simulation, compare against the baselines, and stress-test
            under tighter supply conditions.
          </p>
        </div>
      </section>

      {/* Headline metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Award}
          color="purple"
          label="Robust PPO mean reward"
          value="+4.40"
          subtext="multi-seed verified (std 0.10)"
        />
        <StatCard
          icon={CheckCircle}
          color="green"
          label="Compliance"
          value="4.97 / 5"
          subtext="vs 4.47 for best baseline"
        />
        <StatCard
          icon={TrendingUp}
          color="blue"
          label="Stress-test win @ hard scarcity"
          value="3.89 vs 2.00"
          subtext="compliant feeders, PPO vs baseline"
        />
        <StatCard
          icon={Zap}
          color="purple"
          label="Pilot feeders"
          value={feeders?.length ?? '—'}
          subtext="one per regulatory band"
        />
      </section>

      {/* Feeders */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Pilot feeders</h3>
            <p className="text-sm text-gray-500">
              One feeder per NERC service band, picked near the median cap for each band.
            </p>
          </div>
        </div>

        {feeders === null ? (
          <Skeleton />
        ) : feeders.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">No feeder data loaded.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {feeders.map(f => <FeederCard key={f.feeder} feeder={f} />)}
          </div>
        )}
      </section>

      {/* Quick start */}
      <section className="card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">How to explore</h3>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>
            Open <span className="font-semibold text-brand-blue-700">Live Simulation</span> and run one
            day with PPO Robust at scarcity 0.7 — watch the demand/supply curve and how each feeder
            is served hour by hour.
          </li>
          <li>
            Open <span className="font-semibold text-brand-blue-700">Compare Policies</span> to see how
            PPO performs against the four heuristic baselines over many episodes.
          </li>
          <li>
            Open <span className="font-semibold text-brand-blue-700">Stress Test</span> to see how each
            policy degrades when supply tightens.
          </li>
        </ol>
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, subtext, color }) {
  const colorMap = {
    blue:   { bg: 'bg-brand-blue-50',   text: 'text-brand-blue-700',   icon: 'text-brand-blue-600' },
    green:  { bg: 'bg-brand-green-50',  text: 'text-brand-green-700',  icon: 'text-brand-green-600' },
    purple: { bg: 'bg-brand-purple-50', text: 'text-brand-purple-700', icon: 'text-brand-purple-600' },
  }[color]

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${colorMap.bg} flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 ${colorMap.icon}`} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${colorMap.text}`}>{value}</div>
      <div className="text-sm font-medium text-gray-900 mt-1">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{subtext}</div>
    </div>
  )
}

function FeederCard({ feeder }) {
  const color = BAND_COLORS[feeder.band] || '#6B7280'
  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: color }}
        >
          {feeder.band}
        </div>
        <span className="text-xs text-gray-400 font-medium">{feeder.primary_business_units}</span>
      </div>
      <div className="text-sm font-semibold text-gray-900 leading-snug truncate" title={feeder.feeder}>
        {feeder.feeder}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-gray-400">Committed</div>
          <div className="font-semibold text-gray-900">{feeder.committed_hours_per_day} hrs/day</div>
        </div>
        <div>
          <div className="text-gray-400">Cap</div>
          <div className="font-semibold text-gray-900">{Math.round(feeder.cap_mean)} MWh</div>
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="card p-4 h-36 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-gray-100" />
          <div className="h-3 w-3/4 bg-gray-100 rounded mt-3" />
          <div className="h-3 w-1/2 bg-gray-100 rounded mt-2" />
        </div>
      ))}
    </div>
  )
}
