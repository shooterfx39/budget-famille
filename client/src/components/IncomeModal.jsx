import { useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const FIELDS = [
  { key: 'rafeo', label: 'RAFEO' },
  { key: 'rafeo-special', label: 'RAFEO spécial été' },
  { key: 'pto', label: 'Prestation Trilium (PTO)' },
  { key: 'ace-poe', label: 'ACE + POE' },
  { key: 'tps-tvh', label: 'TPS/TVH' },
  { key: 'autres', label: 'Autres revenus' },
]

export default function IncomeModal({ month, onClose }) {
  const { income, updateIncome } = useApp()
  const current = income?.[month] || {}
  const [vals, setVals] = useState(
    Object.fromEntries(FIELDS.map(f => [f.key, current[f.key] || '']))
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const parsed = Object.fromEntries(
      Object.entries(vals).map(([k, v]) => [k, parseFloat(v) || 0])
    )
    await updateIncome(month, parsed)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-slate-800">Revenus réels du mois</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input type="number" min="0" step="0.01"
                  value={vals[key]}
                  onChange={e => setVals(v => ({ ...v, [key]: e.target.value }))}
                  className="input pl-7" placeholder="0.00" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
