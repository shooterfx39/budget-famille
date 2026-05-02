import { useState } from 'react'
import { ChevronDown, ChevronUp, Save, Loader } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmt } from '../utils/calculations'

export default function BudgetSetup() {
  const { budgetPlanning, categories, months, monthLabels, updateBudget } = useApp()
  const [selectedMonth, setSelectedMonth] = useState(months[0] || '2026-05')
  const [expanded, setExpanded] = useState({})
  const [values, setValues] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const plan = budgetPlanning?.[selectedMonth]
  const workingValues = values || plan

  const setVal = (catId, itemId, newVal) => {
    const current = workingValues || plan || {}
    const updated = {
      ...current,
      categories: {
        ...(current.categories || {}),
        [catId]: {
          ...(current.categories?.[catId] || {}),
          items: {
            ...(current.categories?.[catId]?.items || {}),
            [itemId]: parseFloat(newVal) || 0
          }
        }
      }
    }
    // Recompute total for this category
    const catItems = updated.categories[catId].items
    updated.categories[catId].total = Object.values(catItems).reduce((s, v) => s + (v || 0), 0)
    setValues(updated)
  }

  const setCatTotal = (catId, newVal) => {
    const current = workingValues || plan || {}
    setValues({
      ...current,
      categories: {
        ...(current.categories || {}),
        [catId]: {
          ...(current.categories?.[catId] || {}),
          total: parseFloat(newVal) || 0
        }
      }
    })
  }

  const save = async () => {
    if (!workingValues) return
    setSaving(true)
    await updateBudget(selectedMonth, workingValues)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setValues(null)
  }

  const grandTotal = Object.values(workingValues?.categories || {})
    .reduce((s, c) => s + (c.total || 0), 0)

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1">Configuration</p>
        <h1 className="text-2xl font-black text-slate-800">Budget prévu</h1>
        <p className="text-sm text-slate-400">Ajustez les montants par catégorie</p>
      </div>

      {/* Month selector */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-5 gap-1">
        {months.map(m => (
          <button key={m} onClick={() => { setSelectedMonth(m); setValues(null) }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all
              ${selectedMonth === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {monthLabels[m]}
          </button>
        ))}
      </div>

      {/* Grand total */}
      <div className="card bg-gradient-to-br from-blue-600 to-blue-700 text-white mb-5 border-0 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Total prévu — {monthLabels[selectedMonth]}</p>
        <p className="text-3xl font-black">{fmt(grandTotal)}</p>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {(categories || []).map(cat => {
          const catData = workingValues?.categories?.[cat.id] || {}
          const catTotal = catData.total || 0
          const isExpanded = expanded[cat.id]

          return (
            <div key={cat.id} className="card overflow-hidden">
              {/* Category header */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(e => ({ ...e, [cat.id]: !e[cat.id] }))}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-bold text-sm text-slate-700">{cat.label}</span>
                  {cat.isFixed && <span className="badge-blue text-[9px]">FIXE</span>}
                  {cat.type === 'savings' && <span className="badge-green text-[9px]">ÉPARGNE</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-slate-800">{fmt(catTotal)}</span>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded: items */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  {/* Total override if no items or just set directly */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 flex-1">Total catégorie ($)</span>
                    <input type="number" min="0" step="0.01"
                      value={catTotal}
                      onChange={e => setCatTotal(cat.id, e.target.value)}
                      className="input text-sm font-bold text-right w-28 p-1.5" />
                  </div>

                  {/* Individual items */}
                  {(cat.items || []).map(item => {
                    const v = catData.items?.[item.id] || 0
                    return (
                      <div key={item.id} className="flex items-center gap-2 pl-3">
                        <span className="text-xs text-slate-500 flex-1">{item.label}</span>
                        {item.isFixed && <span className="text-[9px] text-blue-500 font-bold">FIXE</span>}
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                          <input type="number" min="0" step="0.01"
                            value={v || ''}
                            onChange={e => setVal(cat.id, item.id, e.target.value)}
                            className="input text-sm text-right p-1.5 pl-5 w-full"
                            placeholder="0.00" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Save button */}
      <div className="sticky bottom-20 mt-5">
        <button onClick={save} disabled={saving}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all
            ${saved ? 'bg-green-500 text-white' : 'btn-primary'}`}>
          {saving ? <><Loader size={16} className="animate-spin" /> Enregistrement...</>
           : saved ? '✓ Enregistré!'
           : <><Save size={16} /> Enregistrer le budget</>}
        </button>
      </div>
    </div>
  )
}
