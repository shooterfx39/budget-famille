import { useState, useRef } from 'react'
import { Download, Upload, Key, Globe, CheckCircle, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { exportData, importData, lastSync } = useApp()
  const fileRef = useRef()

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        await importData(data)
        alert('Données importées avec succès!')
      } catch {
        alert('Fichier invalide — vérifiez le format JSON')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1">Configuration</p>
        <h1 className="text-2xl font-black text-slate-800">Réglages</h1>
      </div>

      {/* Cloud status */}
      <div className="card mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Globe size={20} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-700">Synchronisation cloud</p>
            <p className="text-xs text-slate-400">Supabase — accessible partout, 24h/24</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600 font-semibold">En ligne</span>
          </div>
        </div>
        {lastSync && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
            <RefreshCw size={12} className="text-slate-400" />
            <p className="text-xs text-slate-400">
              Dernière sync : {new Date(lastSync).toLocaleTimeString('fr-CA')}
            </p>
          </div>
        )}
      </div>

      {/* OCR info */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Key size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="font-bold text-slate-700">Scan de reçus (IA)</p>
            <p className="text-xs text-slate-400">Clé API configurée sur Vercel</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3">
          <p className="text-xs text-slate-300 mb-2">Pour activer le scan de reçus :</p>
          <p className="text-xs text-slate-400">1. Allez sur <span className="text-blue-400 font-semibold">vercel.com</span> → votre projet</p>
          <p className="text-xs text-slate-400">2. Settings → Environment Variables</p>
          <p className="text-xs text-slate-400">3. Ajoutez : <span className="font-mono text-green-400">ANTHROPIC_API_KEY</span></p>
          <p className="text-xs text-slate-400">4. Redéployez le projet</p>
        </div>
      </div>

      {/* Data management */}
      <div className="card mb-4">
        <p className="section-title">Sauvegarde des données</p>
        <div className="space-y-3">
          <button onClick={exportData}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
            <Download size={18} className="text-green-600" />
            <div className="text-left">
              <p className="font-semibold text-sm text-green-800">Exporter les données</p>
              <p className="text-xs text-green-600">Télécharge un fichier JSON de sauvegarde</p>
            </div>
          </button>

          <button onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
            <Upload size={18} className="text-blue-600" />
            <div className="text-left">
              <p className="font-semibold text-sm text-blue-800">Importer des données</p>
              <p className="text-xs text-blue-600">Restaurer depuis un fichier JSON</p>
            </div>
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Sync info */}
      <div className="card bg-blue-50 border border-blue-200">
        <p className="font-bold text-blue-800 text-sm mb-2">🔄 Sync Paterne & Grace</p>
        <p className="text-xs text-blue-700">
          Toutes les saisies sont synchronisées automatiquement en temps réel entre vos deux appareils,
          peu importe où vous êtes — Wi-Fi, 4G, ou 5G.
        </p>
        <p className="text-xs text-blue-600 font-semibold mt-2">
          Grace ajoute une dépense au supermarché → Paterne la voit apparaître instantanément sur son téléphone.
        </p>
      </div>
    </div>
  )
}
