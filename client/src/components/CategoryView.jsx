import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmt, pct, statusColor, spentInCategory, groupItemsByName } from '../utils/calculations'

export default function CategoryView() {
  const { month, categoryId } = useParams()
  const nav = useNavigate()
  const { budgetPlanning, transactions, categories, months, monthLabels, removeTransaction } = useApp()

  const cat = (categories || []).find(c => c.id === categoryId)
  if (!cat) return <div className="p-4 text-slate-500">Catégorie introuvable</div>

  const catPrevu = budgetPlanning?.[month]?.categories?.[categoryId]?.total || 0
  const catReel = spentInCategory(transactions, month, categoryId)
  const p = pct(catReel, catPrevu)
  const col = statusColor(p)

  const txs = (transactions?.[month] || [])
    .filter(t => t.category === categoryId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  // Previous month comparison
  const idx = months.indexOf(month)
  const prevMonth = months[idx - 1]
  const prevReel = prevMonth ? spentInCategory(transactions, prevMonth, categoryId) : null

  // Item groups for this month
  const itemGroups = groupItemsByName(transactions, month)
  const prevItemGroups = prevMonth ? groupItemsByName(transactions, prevMonth) : {}

  const del = async (id) => {
    if (confirm('Supprimer cette transaction?')) {
      await removeTransaction(month, id)
    }
  }

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav(`/mois/${month}`)} className="btn-ghost p-2">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
            <h2 className="font-black text-xl text-slate-800">{cat.label}</h2>
          </div>
          <p className="text-xs text-slate-400">{monthLabels[month]} 2026</p>
        </div>
        <button onClick={() => nav(`/ajouter?month=${month}&category=${categoryId}`)}
          className="btn-primary py-2 px-3 text-xs">
          <Plus size={14} className="inline mr-1" /> Ajouter
        </button>
      </div>

      {/* Budget bar */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Budget prévu</p>
            <p className="text-2xl font-black text-slate-800">{fmt(catPrevu)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Dépensé</p>
            <p className={`text-2xl font-black ${col.text}`}>{fmt(catReel)}</p>
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${col.bar}`}
            style={{ width: `${Math.min(p, 100)}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-slate-500">
          <span className={`font-bold ${col.text}`}>{p}% utilisé</span>
          <span>Restant: <span className="font-bold">{fmt(Math.max(0, catPrevu - catReel))}</span></span>
        </div>

        {prevReel !== null && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">vs {monthLabels[prevMonth]}:</span>
            <div className="flex items-center gap-1">
              {catReel > prevReel
                ? <ArrowUp size={12} className="text-red-500" />
                : catReel < prevReel
                  ? <ArrowDown size={12} className="text-green-500" />
                  : <Minus size={12} className="text-slate-400" />}
              <span className={`text-xs font-bold ${catReel > prevReel ? 'text-red-600' : catReel < prevReel ? 'text-green-600' : 'text-slate-400'}`}>
                {fmt(Math.abs(catReel - prevReel))} {catReel > prevReel ? 'de plus' : catReel < prevReel ? 'de moins' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Item-level comparison (for trackItems categories) */}
      {cat.trackItems && Object.keys(itemGroups).length > 0 && (
        <>
          <p className="section-title">Suivi des articles</p>
          <div className="space-y-2 mb-4">
            {Object.entries(itemGroups).map(([key, group]) => {
              const prevGroup = prevItemGroups[key]
              const totalQty = group.entries.reduce((s, e) => s + e.quantity, 0)
              const avgPrice = group.entries.reduce((s, e) => s + e.unitPrice, 0) / group.entries.length
              const totalSpent = group.entries.reduce((s, e) => s + e.total, 0)

              const prevQty = prevGroup?.entries.reduce((s, e) => s + e.quantity, 0)
              const prevAvgPrice = prevGroup ? prevGroup.entries.reduce((s, e) => s + e.unitPrice, 0) / prevGroup.entries.length : null

              return (
                <div key={key} className="card p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-800">{group.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {totalQty} {group.entries[0]?.unit || 'unité(s)'} · {fmt(avgPrice)}/unité
                      </p>
                    </div>
                    <p className="font-black text-sm text-slate-800">{fmt(totalSpent)}</p>
                  </div>
                  {prevGroup && (
                    <div className="mt-2 pt-2 border-t border-slate-50 grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Qté vs {monthLabels[prevMonth]}</p>
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          {totalQty > prevQty ? <ArrowUp size={10} className="text-amber-500" /> :
                           totalQty < prevQty ? <ArrowDown size={10} className="text-green-500" /> :
                           <Minus size={10} className="text-slate-400" />}
                          <span className={`text-xs font-bold ${totalQty > prevQty ? 'text-amber-600' : totalQty < prevQty ? 'text-green-600' : 'text-slate-400'}`}>
                            {totalQty > prevQty ? '+' : ''}{totalQty - prevQty}
                          </span>
                          <span className="text-[10px] text-slate-400">(was {prevQty})</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Prix vs {monthLabels[prevMonth]}</p>
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          {avgPrice > prevAvgPrice ? <ArrowUp size={10} className="text-red-500" /> :
                           avgPrice < prevAvgPrice ? <ArrowDown size={10} className="text-green-500" /> :
                           <Minus size={10} className="text-slate-400" />}
                          <span className={`text-xs font-bold ${avgPrice > prevAvgPrice ? 'text-red-600' : avgPrice < prevAvgPrice ? 'text-green-600' : 'text-slate-400'}`}>
                            {avgPrice > prevAvgPrice ? '+' : ''}{fmt(avgPrice - prevAvgPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Transactions list */}
      <p className="section-title">Transactions ({txs.length})</p>
      {txs.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-slate-400 text-sm">Aucune transaction pour cette catégorie</p>
          <button onClick={() => nav(`/ajouter?month=${month}&category=${categoryId}`)}
            className="btn-primary mt-3 text-xs">Ajouter</button>
        </div>
      ) : (
        <div className="space-y-2">
          {txs.map(tx => (
            <div key={tx.id} className="card p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-slate-800">{tx.store || 'Sans nom'}</p>
                    <span className="badge-blue text-[9px]">{tx.addedBy}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{tx.date}</p>
                  {tx.items?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {tx.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1">
                          <span>{item.name} × {item.quantity} {item.unit}</span>
                          <span className="font-semibold">{fmt(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {tx.notes && <p className="text-xs text-slate-400 mt-1 italic">"{tx.notes}"</p>}
                </div>
                <div className="flex flex-col items-end gap-2 ml-2">
                  <p className="font-black text-slate-800">{fmt(tx.total)}</p>
                  <button onClick={() => del(tx.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
