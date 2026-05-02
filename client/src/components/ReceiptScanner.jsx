import { useState, useRef } from 'react'
import { Camera, Upload, Loader, CheckCircle, ChevronLeft, AlertCircle, Pencil } from 'lucide-react'
import { scanReceipt } from '../utils/api'
import { fmt } from '../utils/calculations'

export default function ReceiptScanner({ onResult, onCancel }) {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()
  const cameraRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
      const base64 = e.target.result.split(',')[1]
      setImage({ base64, mediaType: file.type || 'image/jpeg' })
      setResult(null)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const scan = async () => {
    if (!image) return
    setScanning(true)
    setError(null)
    try {
      const res = await scanReceipt(image.base64, image.mediaType)
      if (res.error) throw new Error(res.error)
      setResult(res)
    } catch (e) {
      setError(e.message)
    }
    setScanning(false)
  }

  const updateResultItem = (i, field, val) => {
    setResult(prev => ({
      ...prev,
      items: prev.items.map((item, idx) => {
        if (idx !== i) return item
        const updated = { ...item, [field]: field === 'name' ? val : parseFloat(val) || 0 }
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = (updated.quantity * updated.unitPrice)
        }
        return updated
      })
    }))
  }

  const confirm = () => {
    if (!result) return
    onResult({
      store: result.store || '',
      date: result.date || '',
      total: result.total || 0,
      items: result.items?.map(i => ({
        name: i.name, quantity: i.quantity || 1,
        unit: i.unit || 'unité',
        unitPrice: i.unitPrice || i.total || 0,
        total: i.total || 0
      })) || []
    })
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onCancel} className="btn-ghost p-2"><ChevronLeft size={20} /></button>
        <div>
          <h2 className="font-black text-xl text-slate-800">Scanner un reçu</h2>
          <p className="text-xs text-slate-400">Photo → Articles automatiques via IA</p>
        </div>
      </div>

      {/* Image capture */}
      {!preview ? (
        <div className="space-y-3">
          <button onClick={() => cameraRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-2xl font-semibold text-base hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md">
            <Camera size={22} /> Prendre une photo
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={e => handleFile(e.target.files[0])} />

          <button onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 bg-slate-100 text-slate-700 py-4 rounded-2xl font-semibold text-base hover:bg-slate-200 active:scale-[0.99] transition-all">
            <Upload size={22} /> Choisir une image
          </button>
          <input ref={fileRef} type="file" accept="image/*"
            className="hidden" onChange={e => handleFile(e.target.files[0])} />

          <div className="card bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-700 font-semibold">
              ⚠️ Pour utiliser le scan IA, configurez votre clé API Anthropic dans Réglages.
              Sans clé API, vous pouvez saisir les articles manuellement.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image preview */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200">
            <img src={preview} alt="Reçu" className="w-full max-h-64 object-contain bg-slate-50" />
            <button onClick={() => { setPreview(null); setImage(null); setResult(null) }}
              className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 text-xs font-semibold text-slate-600 shadow">
              Changer
            </button>
          </div>

          {/* Scan button */}
          {!result && (
            <button onClick={scan} disabled={scanning}
              className="btn-primary w-full py-3 text-base">
              {scanning
                ? <><Loader size={18} className="animate-spin inline mr-2" />Analyse en cours...</>
                : <><Camera size={18} className="inline mr-2" />Analyser le reçu avec IA</>}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="card bg-red-50 border border-red-200 p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-green-500" />
                <p className="font-bold text-slate-700">Reçu analysé — vérifiez et corrigez si nécessaire</p>
              </div>

              <div className="card mb-3 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Magasin</label>
                    <input type="text" value={result.store || ''} className="input text-sm"
                      onChange={e => setResult(r => ({ ...r, store: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Date</label>
                    <input type="date" value={result.date || ''} className="input text-sm"
                      onChange={e => setResult(r => ({ ...r, date: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {(result.items || []).map((item, i) => (
                  <div key={i} className="card p-3">
                    <input type="text" value={item.name} className="input text-sm font-semibold mb-2"
                      onChange={e => updateResultItem(i, 'name', e.target.value)}
                      placeholder="Nom de l'article" />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Quantité</p>
                        <input type="number" value={item.quantity} className="input text-sm p-1.5"
                          onChange={e => updateResultItem(i, 'quantity', e.target.value)} />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Prix/unité</p>
                        <input type="number" value={item.unitPrice} className="input text-sm p-1.5"
                          onChange={e => updateResultItem(i, 'unitPrice', e.target.value)} />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total</p>
                        <input type="number" value={item.total} className="input text-sm p-1.5 font-bold"
                          onChange={e => updateResultItem(i, 'total', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card bg-slate-50 p-3 mb-4 flex justify-between">
                <span className="font-bold text-slate-600">Total détecté</span>
                <span className="font-black text-slate-800">
                  {fmt(result.items?.reduce((s, i) => s + (i.total || 0), 0) || result.total || 0)}
                </span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setResult(null)} className="btn-secondary flex-1">Re-analyser</button>
                <button onClick={confirm} className="btn-primary flex-1">
                  <Pencil size={14} className="inline mr-1" /> Utiliser ces données
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
