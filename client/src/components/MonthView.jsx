import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmt, pct, statusColor, totalPrevu, totalReel, totalIncomePrevu, totalIncomeReel, spentInCategory } from '../utils/calculations'
import IncomeModal from './IncomeModal'

const INCOME_LABELS = {
  rafeo: 'RAFEO', 'rafeo-special': 'RAFEO (spécial été)',
  pto: 'Prestation Trilium (PTO)', 'ace-poe': 'ACE + POE',
  'tps-tvh': 'TPS/TVH', autres: 'Autres revenus'
}

export default function MonthView() {
  const { month } = useParams()
  const nav = useNavigate()
  const { budgetPlanning, transactions, income, categories, months, monthLabels, updateIncome } = useApp()
  const [showIncome, setShowIncome] = useState(false)

  const label = monthLabels[month] || month
  const idx = months.indexOf(month)
  const prevMonth = months[idx - 1]
  const nextMonth = months[idx + 1]

  const plan = budgetPlanning?.[month] || {}
  const incomePrevu = totalIncomePrevu(budgetPlanning, month)
  const incomeReel = totalIncomeReel(income, month)
  const reelTotal = totalReel(transactions, month)
  const prevuTotal = totalPrevu(budgetPlanning, month)
  const bilan = incomeReel - reelTotal

  const recentTx = [...(transactions?.[month] || [])]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  const catById = Object.fromEntries((categories || []).map(c => [c.id, c]))

  return (
    <div className="px-4 pt-4 pb-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/')} className="btn-ghost p-2">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="font-black text-xl text-slate-800">{label} 2026</h2>
          <p className="text-xs text-slate-400">Budget mensuel détaillé</p>
        </div>
        <div className="flex gap-1">
          {prevMonth && (
            <button onClick={() => nav(`/mois/${prevMonth}`)} className="btn-ghost p-2">
              <ChevronLeft size={16} />
            </button>
          )}
          {nextMonth && (
            <button onClick={() => nav(`/mois/${nextMonth}`)} className="btn-ghost p-2">
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Bilan rapide */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="card p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Revenus réels</p>
          <p className="text-base font-black text-green-600 mt-0.5">{fmt(incomeReel)}</p>
          <p className="text-[10px] text-slate-400">prévu {fmt(incomePrevu)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Dépenses</p>
          <p className={`text-base font-black mt-0.5 ${pct(reelTotal, prevuTotal) >= 80 ? 'text-red-600' : 'text-slate-700'}`}>
            {fmt(reelTotal)}
          </p>
          <p className="text-[10px] text-slate-400">prévu {fmt(prevuTotal)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Bilan</p>
          <p className={`text-base font-black mt-0.5 ${bilan >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {bilan >= 0 ? <TrendingDown size={14} className="inline" /> : <TrendingUp size={14} className="inline" />}
            {fmt(Math.abs(bilan))}
          </p>
          <p className={`text-[10px] font-semibold ${bilan >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {bilan >= 0 ? 'excédent' : 'déficit'}
          </p>
        </div>
      </div>

      {/* Revenus */}
      <div className="flex items-center justify-between mb-2">
        <p className="section-title mb-0">Revenus du mois</p>
        <button onClick={() => setShowIncome(true)} className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
          <Pencil size={12} /> Modifier
        </button>
      </div>
      <div className="card mb-4 p-3">
        {Object.entries(plan.income || {}).filter(([, v]) => v > 0).map(([k, v]) => (
          <div key={k} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-600">{INCOME_LABELS[k] || k}</span>
            <div className="text-right">
              <span className="text-sm font-bold text-slate-800">{fmt(v)}</span>
              {income?.[month]?.[k] !== undefined && (
                <span className={`ml-2 text-xs font-semibold ${income[month][k] >= v ? 'text-green-600' : 'text-amber-600'}`}>
                  réel: {fmt(income[month][k])}
                </span>
              )}
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center pt-2 mt-1">
          <span className="text-sm font-bold text-slate-700">Total prévu</span>
          <span className="text-sm font-black text-slate-800">{fmt(incomePrevu)}</span>
        </div>
      </div>

      {/* Categories grid */}
      <p className="section-title">Catégories de dépenses</p>
      <div className="space-y-2 mb-4">
        {(categories || []).map(cat => {
          const catPlan = plan.categories?.[cat.id]
          const catPrevu = catPlan?.total || 0
          const catReel = spentInCategory(transactions, month, cat.id)
          const p = pct(catReel, catPrevu)
          const col = statusColor(p)
          if (catPrevu === 0 && catReel === 0) return null

          return (
            <div key={cat.id}
              onClick={() => nav(`/mois/${month}/categorie/${cat.id}`)}
              className={`card cursor-pointer hover:shadow-md transition-all active:scale-[0.99] p-3 ${catPrevu > 0 && p >= 80 ? col.border + ' border' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-semibold text-sm text-slate-700">{cat.label}</span>
                  {cat.isFixed && <span className="badge-blue text-[9px]">FIXE</span>}
                  {cat.type === 'savings' && <span className="badge-green text-[9px]">ÉPARGNE</span>}
                </div>
                <div className="flex items-center gap-2">
                  {catPrevu > 0 && <span className={col.badge}>{p}%</span>}
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>Réel: <span className="font-bold text-slate-700">{fmt(catReel)}</span></span>
                <span>Prévu: <span className="font-bold">{fmt(catPrevu)}</span></span>
              </div>
              {catPrevu > 0 && (
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${col.bar}`}
                    style={{ width: `${Math.min(p, 100)}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Recent transactions */}
      <div className="flex items-center justify-between mb-2">
        <p className="section-title mb-0">Dernières transactions</p>
        <button onClick={() => nav(`/ajouter?month=${month}`)}
          className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
          <Plus size={12} /> Ajouter
        </button>
      </div>

      {recentTx.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-slate-400 text-sm">Aucune transaction ce mois</p>
          <button onClick={() => nav(`/ajouter?month=${month}`)} className="btn-primary mt-3 text-xs">
            Ajouter une dépense
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {recentTx.map(tx => (
            <div key={tx.id} onClick={() => nav(`/transaction/${tx.id}?month=${month}`)}
              className="card p-3 cursor-pointer hover:shadow-md active:scale-[0.99]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm text-slate-800">{tx.store || 'Sans nom'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {catById[tx.category]?.label || tx.category} · {tx.date} · {tx.addedBy}
                  </p>
                  {tx.items?.length > 0 && (
                    <p className="text-xs text-slate-400">{tx.items.length} article(s)</p>
                  )}
                </div>
                <span className="font-black text-slate-800 text-sm">{fmt(tx.total)}</span>
              </div>
            </div>
          ))}
          {(transactions?.[month]?.length || 0) > 5 && (
            <p className="text-center text-xs text-slate-400 py-2">
              + {(transactions[month].length - 5)} autre(s) transaction(s)
            </p>
          )}
        </div>
      )}

      {/* FAB */}
      <button onClick={() => nav(`/ajouter?month=${month}`)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all z-40">
        <Plus size={24} className="text-white" />
      </button>

      {showIncome && (
        <IncomeModal month={month} onClose={() => setShowIncome(false)} />
      )}
    </div>
  )
}
