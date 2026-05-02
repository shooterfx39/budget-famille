import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Camera, Loader } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmt } from '../utils/calculations'
import ReceiptScanner from './ReceiptScanner'

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const UNITS = ['unité', 'kg', 'g', 'L', 'mL', 'sac', 'pack', 'boîte', 'bouteille', 'pot', 'tube', 'rouleau', 'paire', 'tranche', 'portion']

export default function AddTransaction() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { categories, months, monthLabels, transactions, addTransaction } = useApp()

  const defaultMonth = params.get('month') || months[0] || '2026-05'
  const defaultCat = params.get('category') || ''

  const [month, setMonth] = useState(defaultMonth)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [store, setStore] = useState('')
  const [category, setCategory] = useState(defaultCat)
  const [addedBy, setAddedBy] = useState('Paterne')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ id: uuid(), name: '', quantity: 1, unit: 'unité', unitPrice: '', total: '' }])
  const [saving, setSaving] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Autocomplete suggestions from past transactions
  const allItemNames = [...new Set(
    Object.values(transactions || {})
      .flat()
      .flatMap(tx => tx.items || [])
      .map(i => i.name)
      .filter(Boolean)
  )].sort()

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        const q = parseFloat(field === 'quantity' ? value : updated.quantity) || 0
        const p = parseFloat(field === 'unitPrice' ? value : updated.unitPrice) || 0
        updated.total = q > 0 && p > 0 ? (q * p).toFixed(2) : updated.total
      }
      return updated
    }))
  }

  const addItem = () => setItems(prev => [...prev, { id: uuid(), name: '', quantity: 1, unit: 'unité', unitPrice: '', total: '' }])
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))

  const total = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0)

  const handleScanResult = useCallback((scanned) => {
    if (scanned.store) setStore(scanned.store)
    if (scanned.date) setDate(scanned.date)
    if (scanned.items?.length > 0) {
      setItems(scanned.items.map(i => ({ ...i, id: uuid() })))
    }
    setShowScanner(false)
  }, [])

  const save = async () => {
    if (!category) return alert('Choisissez une catégorie')
    if (!date) return alert('Choisissez une date')
    const validItems = items.filter(i => i.name && (parseFloat(i.total) > 0))
    const txTotal = validItems.length > 0
      ? validItems.reduce((s, i) => s + parseFloat(i.total), 0)
      : parseFloat(prompt('Montant total (si pas d\'articles détaillés):') || 0)

    if (txTotal === 0 && validItems.length === 0) return alert('Entrez au moins un montant')

    setSaving(true)
    const tx = {
      id: uuid(),
      date, store, category, addedBy, notes,
      total: Math.round(txTotal * 100) / 100,
      items: validItems.map(i => ({
        name: i.name,
        quantity: parseFloat(i.quantity) || 1,
        unit: i.unit,
        unitPrice: parseFloat(i.unitPrice) || parseFloat(i.total) || 0,
        total: parseFloat(i.total) || 0
      }))
    }
    await addTransaction(month, tx)
    setSaving(false)
    nav(`/mois/${month}`)
  }

  if (showScanner) return (
    <ReceiptScanner onResult={handleScanResult} onCancel={() => setShowScanner(false)} />
  )

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => nav(-1)} className="btn-ghost p-2"><ChevronLeft size={20} /></button>
        <div>
          <h2 className="font-black text-xl text-slate-800">Nouvelle dépense</h2>
          <p className="text-xs text-slate-400">Saisie quotidienne</p>
        </div>
      </div>

      {/* Receipt Scanner button */}
      <button onClick={() => setShowScanner(true)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 rounded-xl py-3 mb-5 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors">
        <Camera size={18} /> Scanner un reçu de caisse
      </button>

      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Mois</label>
            <select value={month} onChange={e => setMonth(e.target.value)} className="select">
              {months.map(m => <option key={m} value={m}>{monthLabels[m]} 2026</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
          </div>
        </div>

        <div>
          <label className="label">Magasin / Fournisseur</label>
          <input type="text" value={store} onChange={e => setStore(e.target.value)}
            placeholder="ex: Costco, Maxi, Pharmacie..." className="input" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Catégorie *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="select">
              <option value="">Choisir...</option>
              {(categories || []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ajouté par</label>
            <select value={addedBy} onChange={e => setAddedBy(e.target.value)} className="select">
              <option>Paterne</option>
              <option>Grace</option>
            </select>
          </div>
        </div>

        {/* Items list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Articles détaillés</label>
            <span className="text-xs text-slate-400">Total: <span className="font-black text-slate-700">{fmt(total)}</span></span>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="card p-3 border border-slate-100">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs font-bold text-slate-400 w-5">#{idx + 1}</span>
                  <div className="relative flex-1">
                    <input type="text" value={item.name}
                      onChange={e => updateItem(item.id, 'name', e.target.value)}
                      placeholder="Nom de l'article..." className="input text-sm"
                      list={`names-${item.id}`} />
                    <datalist id={`names-${item.id}`}>
                      {allItemNames.map(n => <option key={n} value={n} />)}
                    </datalist>
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(item.id)} className="text-red-400 p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Qté</p>
                    <input type="number" min="0.01" step="0.01" value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                      className="input text-sm text-center p-1.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Unité</p>
                    <select value={item.unit}
                      onChange={e => updateItem(item.id, 'unit', e.target.value)}
                      className="select text-sm p-1.5">
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Prix/unité</p>
                    <input type="number" min="0" step="0.01" value={item.unitPrice}
                      onChange={e => updateItem(item.id, 'unitPrice', e.target.value)}
                      className="input text-sm p-1.5" placeholder="0.00" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total</p>
                    <input type="number" min="0" step="0.01" value={item.total}
                      onChange={e => updateItem(item.id, 'total', e.target.value)}
                      className="input text-sm p-1.5 font-bold" placeholder="0.00" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addItem}
            className="w-full mt-2 border-2 border-dashed border-slate-200 rounded-xl py-2 text-sm text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-2">
            <Plus size={16} /> Ajouter un article
          </button>
        </div>

        <div>
          <label className="label">Notes (optionnel)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={2} className="input resize-none" placeholder="Remarques, détails..." />
        </div>

        {/* Total + Save */}
        <div className="card bg-slate-50 border-slate-200 p-4">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-600">TOTAL TRANSACTION</span>
            <span className="text-2xl font-black text-slate-800">{fmt(total)}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => nav(-1)} className="btn-secondary flex-1">Annuler</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? <><Loader size={16} className="animate-spin inline mr-2" />Enregistrement...</> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
