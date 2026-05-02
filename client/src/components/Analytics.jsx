import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmt, totalPrevu, totalReel, spentInCategory, getAllItemNames, groupItemsByName } from '../utils/calculations'

const TABS = ['Vue globale', 'Par catégorie', 'Articles']

const fmtShort = (v) => `$${Math.round(v)}`

export default function Analytics() {
  const { budgetPlanning, transactions, categories, months, monthLabels } = useApp()
  const [tab, setTab] = useState(0)
  const [selectedItem, setSelectedItem] = useState('')

  const allItems = getAllItemNames(transactions)

  // Monthly totals
  const monthlyData = months.map(m => ({
    mois: monthLabels[m],
    'Prévu': Math.round(totalPrevu(budgetPlanning, m)),
    'Réel': Math.round(totalReel(transactions, m))
  }))

  // Category breakdown for all months combined
  const catData = (categories || []).map(cat => ({
    name: cat.label,
    color: cat.color,
    prevu: months.reduce((s, m) => s + (budgetPlanning?.[m]?.categories?.[cat.id]?.total || 0), 0),
    reel: months.reduce((s, m) => s + spentInCategory(transactions, m, cat.id), 0)
  })).filter(d => d.prevu > 0 || d.reel > 0)
    .sort((a, b) => b.reel - a.reel)

  // Item price evolution
  const itemEvolution = selectedItem
    ? months.map(m => {
        const groups = groupItemsByName(transactions, m)
        const key = selectedItem.toLowerCase().trim()
        const group = groups[key]
        if (!group) return { mois: monthLabels[m], quantite: 0, prixMoyen: 0, total: 0 }
        const qty = group.entries.reduce((s, e) => s + e.quantity, 0)
        const avgP = group.entries.reduce((s, e) => s + e.unitPrice, 0) / group.entries.length
        const tot = group.entries.reduce((s, e) => s + e.total, 0)
        return { mois: monthLabels[m], quantite: Math.round(qty * 100) / 100, prixMoyen: Math.round(avgP * 100) / 100, total: Math.round(tot * 100) / 100 }
      })
    : []

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {fmt(p.value)}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1">Analytiques</p>
        <h1 className="text-2xl font-black text-slate-800">Analyses & Tendances</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-5 gap-1">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all
              ${tab === i ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: Vue globale */}
      {tab === 0 && (
        <div className="space-y-5">
          <div className="card">
            <p className="section-title">Prévu vs Réel par mois</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Prévu" fill="#bfdbfe" radius={[4,4,0,0]} />
                <Bar dataKey="Réel" fill="#2563eb" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-200" /><span className="text-xs text-slate-500">Prévu</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-600" /><span className="text-xs text-slate-500">Réel</span></div>
            </div>
          </div>

          {/* Month comparison table */}
          <div className="card">
            <p className="section-title">Récapitulatif mensuel</p>
            <div className="space-y-2">
              {months.map(m => {
                const p = totalPrevu(budgetPlanning, m)
                const r = totalReel(transactions, m)
                const diff = p - r
                return (
                  <div key={m} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="font-bold text-sm text-slate-700 w-20">{monthLabels[m]}</span>
                    <div className="flex-1 mx-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r/p >= 1 ? 'bg-red-400' : r/p >= 0.8 ? 'bg-amber-400' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, p > 0 ? (r/p)*100 : 0)}%` }} />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-700">{fmt(r)}</p>
                      <p className={`text-[10px] font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff >= 0 ? '+' : ''}{fmt(diff)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Par catégorie */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="card">
            <p className="section-title">Dépenses par catégorie (4 mois)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catData.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="reel" name="Réel" fill="#2563eb" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {catData.map(cat => {
              const p = cat.prevu > 0 ? Math.round((cat.reel / cat.prevu) * 100) : 0
              return (
                <div key={cat.name} className="card p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                      <span className="text-sm font-semibold text-slate-700">{cat.name}</span>
                    </div>
                    <span className={`text-xs font-bold ${p >= 100 ? 'text-red-600' : p >= 80 ? 'text-amber-600' : 'text-green-600'}`}>{p}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p >= 100 ? 'bg-red-500' : p >= 80 ? 'bg-amber-400' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(p, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Réel: {fmt(cat.reel)}</span>
                    <span>Prévu: {fmt(cat.prevu)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Articles */}
      {tab === 2 && (
        <div className="space-y-4">
          <div>
            <label className="label">Choisir un article à suivre</label>
            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="select">
              <option value="">Sélectionner...</option>
              {allItems.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {selectedItem && itemEvolution.length > 0 && (
            <>
              <div className="card">
                <p className="section-title">Prix moyen — {selectedItem}</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={itemEvolution} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="prixMoyen" name="Prix/unité" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <p className="section-title">Quantité achetée — {selectedItem}</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={itemEvolution} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="quantite" name="Quantité" fill="#059669" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Month-over-month comparison */}
              <div className="card">
                <p className="section-title">Évolution mois par mois</p>
                {itemEvolution.map((d, i) => {
                  const prev = i > 0 ? itemEvolution[i - 1] : null
                  return (
                    <div key={d.mois} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <span className="font-bold text-sm w-16">{d.mois}</span>
                      <div className="flex gap-4 text-xs">
                        <div className="text-center">
                          <p className="text-slate-400">Qté</p>
                          <div className="flex items-center gap-0.5">
                            {prev && d.quantite !== prev.quantite && (
                              d.quantite > prev.quantite
                                ? <ArrowUp size={10} className="text-amber-500" />
                                : <ArrowDown size={10} className="text-green-500" />
                            )}
                            <span className="font-bold text-slate-700">{d.quantite}</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400">Prix/u</p>
                          <div className="flex items-center gap-0.5">
                            {prev && d.prixMoyen !== prev.prixMoyen && (
                              d.prixMoyen > prev.prixMoyen
                                ? <ArrowUp size={10} className="text-red-500" />
                                : <ArrowDown size={10} className="text-green-500" />
                            )}
                            <span className={`font-bold ${prev && d.prixMoyen > prev.prixMoyen ? 'text-red-600' : prev && d.prixMoyen < prev.prixMoyen ? 'text-green-600' : 'text-slate-700'}`}>
                              {fmt(d.prixMoyen)}
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400">Total</p>
                          <span className="font-bold text-slate-700">{fmt(d.total)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {selectedItem && itemEvolution.every(d => d.quantite === 0) && (
            <div className="card text-center py-8">
              <p className="text-slate-400 text-sm">Aucun achat de "{selectedItem}" enregistré</p>
            </div>
          )}

          {!selectedItem && (
            <div className="card text-center py-10">
              <p className="text-3xl mb-3">📊</p>
              <p className="font-semibold text-slate-600">Sélectionnez un article</p>
              <p className="text-sm text-slate-400 mt-1">Suivez l'évolution du prix et des quantités mois par mois</p>
              <p className="text-xs text-slate-400 mt-3">ex: Sac de patates, Pack d'eau, Poulet...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
