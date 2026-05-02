import { useNavigate } from 'react-router-dom'
import { AlertTriangle, TrendingDown, TrendingUp, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmt, pct, statusColor, totalPrevu, totalReel, fourMonthSummary, spentInCategory } from '../utils/calculations'

function MonthCard({ month, label }) {
  const { budgetPlanning, transactions, categories } = useApp()
  const nav = useNavigate()
  const prevu = totalPrevu(budgetPlanning, month)
  const reel = totalReel(transactions, month)
  const p = pct(reel, prevu)
  const col = statusColor(p)

  // Find top over-budget categories
  const alerts = (categories || []).filter(cat => {
    const catPrevu = budgetPlanning?.[month]?.categories?.[cat.id]?.total || 0
    const catReel = spentInCategory(transactions, month, cat.id)
    return catPrevu > 0 && pct(catReel, catPrevu) >= 80
  }).slice(0, 2)

  return (
    <div onClick={() => nav(`/mois/${month}`)}
      className="card cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-700 text-base">{label} 2026</h3>
          <p className="text-xs text-slate-400 mt-0.5">{fmt(reel)} dépensé sur {fmt(prevu)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-black ${col.text}`}>{p}%</span>
          <ChevronRight size={16} className="text-slate-300" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${col.bar}`}
          style={{ width: `${p}%` }} />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">
          Écart: <span className={`font-bold ${(prevu - reel) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(prevu - reel) >= 0 ? '+' : ''}{fmt(prevu - reel)}
          </span>
        </span>
        {alerts.length > 0 && (
          <div className="flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-500" />
            <span className="text-xs text-amber-600 font-semibold">{alerts.length} alerte(s)</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { budgetPlanning, transactions, months, monthLabels, categories, loading } = useApp()
  const nav = useNavigate()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Chargement du budget...</p>
        <p className="text-slate-400 text-xs mt-2">Vérifiez que le serveur est démarré</p>
      </div>
    </div>
  )

  const summary = fourMonthSummary(budgetPlanning, transactions, months)

  // Alertes globales (catégories ≥ 80% dans n'importe quel mois)
  const globalAlerts = []
  for (const month of months) {
    for (const cat of (categories || [])) {
      const catPrevu = budgetPlanning?.[month]?.categories?.[cat.id]?.total || 0
      const catReel = spentInCategory(transactions, month, cat.id)
      const p = pct(catReel, catPrevu)
      if (catPrevu > 0 && p >= 80) {
        globalAlerts.push({ month, monthLabel: monthLabels[month], cat, p, catPrevu, catReel })
      }
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1">Été 2026</p>
        <h1 className="text-2xl font-black text-slate-800">Budget Famille</h1>
        <p className="text-sm text-slate-400 mt-0.5">Mai → Août 2026</p>
      </div>

      {/* 4-month global card */}
      <div className="card bg-gradient-to-br from-blue-600 to-blue-700 text-white mb-6 border-0">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Enveloppe globale 4 mois</p>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-3xl font-black">{fmt(summary.reel)}</p>
            <p className="text-blue-200 text-sm">sur {fmt(summary.prevu)} prévu</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black ${summary.ecart >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {summary.ecart >= 0 ? <TrendingDown size={20} className="inline mr-1" /> : <TrendingUp size={20} className="inline mr-1" />}
              {summary.pct}%
            </p>
            <p className="text-blue-200 text-xs">utilisé</p>
          </div>
        </div>
        <div className="h-2 bg-blue-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${summary.pct >= 100 ? 'bg-red-400' : summary.pct >= 80 ? 'bg-amber-400' : 'bg-green-400'}`}
            style={{ width: `${summary.pct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-blue-200">
          <span>Restant: <span className="font-bold text-white">{fmt(summary.ecart)}</span></span>
          <span>{summary.pct}% consommé</span>
        </div>
      </div>

      {/* Month cards */}
      <p className="section-title">Détail par mois</p>
      <div className="grid grid-cols-1 gap-3 mb-6">
        {months.map(m => (
          <MonthCard key={m} month={m} label={monthLabels[m]} />
        ))}
      </div>

      {/* Alerts */}
      {globalAlerts.length > 0 && (
        <>
          <p className="section-title">⚠️ Alertes budget</p>
          <div className="space-y-2">
            {globalAlerts.slice(0, 5).map(({ month, monthLabel, cat, p, catPrevu, catReel }, i) => (
              <div key={i} onClick={() => nav(`/mois/${month}/categorie/${cat.id}`)}
                className={`card cursor-pointer p-3 border ${p >= 100 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-slate-700">{cat.label}</p>
                    <p className="text-xs text-slate-500">{monthLabel} · {fmt(catReel)} / {fmt(catPrevu)}</p>
                  </div>
                  <span className={p >= 100 ? 'badge-red' : 'badge-amber'}>{p}%</span>
                </div>
                <div className="h-1.5 bg-white rounded-full mt-2 overflow-hidden">
                  <div className={`h-full rounded-full ${p >= 100 ? 'bg-red-500' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(p, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
