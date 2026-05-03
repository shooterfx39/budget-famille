import { useState, useRef } from 'react'
import {
  DndContext, closestCenter,
  PointerSensor, TouchSensor,
  useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown, ChevronUp, Save, Loader,
  Pencil, Check, X, Plus, Trash2, GripVertical, RefreshCw
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fmt } from '../utils/calculations'

const PRESET_COLORS = [
  '#1e40af','#7c3aed','#059669','#b45309','#e11d48',
  '#db2777','#f59e0b','#dc2626','#0891b2','#65a30d',
  '#9333ea','#ea580c','#0d9488','#6366f1','#84cc16'
]

function uid() {
  return 'cat-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6)
}

// ── Carte catégorie triable ──────────────────────────────────────────────────
function SortableCategory({
  cat, catData, isExpanded, onToggle,
  editingCat, editCatLabel, setEditCatLabel, catInputRef,
  onStartRenameCat, onSaveRenameCat, onCancelRenameCat, onDeleteCat,
  editingItem, editItemLabel, setEditItemLabel, itemInputRef,
  onStartRenameItem, onSaveRenameItem, onCancelRenameItem, onDeleteItem,
  addingItemCat, newItemLabel, setNewItemLabel, newItemRef,
  onStartAddItem, onSaveAddItem, onCancelAddItem,
  onChangeCatTotal, onChangeItemVal
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto'
  }

  const catTotal = catData?.total || 0
  const itemsSum = Object.values(catData?.items || {}).reduce((s,v) => s+(v||0), 0)
  const sumDiffersFromTotal = Math.abs(itemsSum - catTotal) > 0.01
  const isEditingCat = editingCat === cat.id

  return (
    <div ref={setNodeRef} style={style} className="card overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center gap-2">
        {/* Poignée drag */}
        <button {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 flex-shrink-0 touch-none">
          <GripVertical size={18} />
        </button>

        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />

        {/* Nom catégorie */}
        {isEditingCat ? (
          <div className="flex items-center gap-1 flex-1">
            <input ref={catInputRef} value={editCatLabel}
              onChange={e => setEditCatLabel(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') onSaveRenameCat(cat.id); if (e.key==='Escape') onCancelRenameCat() }}
              className="input text-sm font-bold flex-1 py-1 px-2" />
            <button onClick={() => onSaveRenameCat(cat.id)} className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
              <Check size={13} className="text-white" />
            </button>
            <button onClick={onCancelRenameCat} className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center">
              <X size={13} className="text-slate-600" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 cursor-pointer min-w-0"
            onClick={() => onToggle(cat.id)}>
            <span className="font-bold text-sm text-slate-700 truncate">{cat.label}</span>
            {cat.isFixed && <span className="badge-blue text-[9px] flex-shrink-0">FIXE</span>}
            {cat.type==='savings' && <span className="badge-green text-[9px] flex-shrink-0">ÉPARGNE</span>}
          </div>
        )}

        {/* Actions */}
        {!isEditingCat && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={e => onStartRenameCat(e, cat)}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-100 flex items-center justify-center">
              <Pencil size={12} className="text-slate-400" />
            </button>
            <button onClick={e => onDeleteCat(e, cat.id)}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center">
              <Trash2 size={12} className="text-slate-400 hover:text-red-500" />
            </button>
            <span className="font-black text-sm text-slate-800 ml-1">{fmt(catTotal)}</span>
            <button onClick={() => onToggle(cat.id)}>
              {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
          </div>
        )}
      </div>

      {/* Contenu étendu */}
      {isExpanded && !isEditingCat && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">

          {/* Total catégorie */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
            <div className="flex-1">
              <span className="text-xs font-bold text-slate-600">Total catégorie ($)</span>
              {sumDiffersFromTotal && (
                <p className="text-[10px] text-amber-600">
                  Somme des lignes : {fmt(itemsSum)}
                  <button onClick={() => onChangeCatTotal(cat.id, itemsSum)}
                    className="ml-1 underline font-semibold">
                    ↑ Utiliser
                  </button>
                </p>
              )}
            </div>
            <input type="number" min="0" step="0.01" value={catTotal}
              onChange={e => onChangeCatTotal(cat.id, e.target.value)}
              className="input text-sm font-bold text-right w-28 p-1.5" />
          </div>

          {/* Lignes */}
          {(cat.items || []).map(item => {
            const v = catData?.items?.[item.id] || 0
            const isEditingThisItem = editingItem?.catId===cat.id && editingItem?.itemId===item.id

            return (
              <div key={item.id} className="flex items-center gap-2 pl-2 py-0.5 rounded-lg hover:bg-slate-50">
                {isEditingThisItem ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input ref={itemInputRef} value={editItemLabel}
                      onChange={e => setEditItemLabel(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter') onSaveRenameItem(); if (e.key==='Escape') onCancelRenameItem() }}
                      className="input text-xs flex-1 py-1 px-2" />
                    <button onClick={onSaveRenameItem} className="w-6 h-6 rounded bg-green-500 flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </button>
                    <button onClick={onCancelRenameItem} className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center">
                      <X size={11} className="text-slate-600" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs text-slate-600 flex-1 truncate">{item.label}</span>
                    <button onClick={e => onStartRenameItem(e, cat.id, item)}
                      className="w-6 h-6 rounded hover:bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Pencil size={10} className="text-slate-400" />
                    </button>
                    <button onClick={e => onDeleteItem(e, cat.id, item.id)}
                      className="w-6 h-6 rounded hover:bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Trash2 size={10} className="text-slate-400 hover:text-red-500" />
                    </button>
                    <div className="relative w-24 flex-shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input type="number" min="0" step="0.01" value={v||''}
                        onChange={e => onChangeItemVal(cat.id, item.id, e.target.value)}
                        className="input text-xs text-right p-1 pl-5 w-full" placeholder="0.00" />
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {/* Ajout ligne */}
          {addingItemCat===cat.id ? (
            <div className="flex items-center gap-1 pl-2">
              <input ref={newItemRef} value={newItemLabel}
                onChange={e => setNewItemLabel(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') onSaveAddItem(cat.id); if (e.key==='Escape') onCancelAddItem() }}
                className="input text-xs flex-1 py-1 px-2" placeholder="Nom de la ligne..." />
              <button onClick={() => onSaveAddItem(cat.id)} className="w-6 h-6 rounded bg-green-500 flex items-center justify-center">
                <Check size={11} className="text-white" />
              </button>
              <button onClick={onCancelAddItem} className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center">
                <X size={11} className="text-slate-600" />
              </button>
            </div>
          ) : (
            <button onClick={e => onStartAddItem(e, cat.id)}
              className="flex items-center gap-1 text-xs text-blue-600 font-semibold pl-2 py-1 hover:text-blue-700">
              <Plus size={13} /> Ajouter une ligne
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function BudgetSetup() {
  const { budgetPlanning, categories, months, monthLabels, updateBudget, updateCategories } = useApp()
  const [selectedMonth, setSelectedMonth] = useState(months[0] || '2026-05')
  const [expanded, setExpanded] = useState({})
  const [values, setValues] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [editingCat, setEditingCat] = useState(null)
  const [editCatLabel, setEditCatLabel] = useState('')
  const catInputRef = useRef()

  const [editingItem, setEditingItem] = useState(null)
  const [editItemLabel, setEditItemLabel] = useState('')
  const itemInputRef = useRef()

  const [addingItemCat, setAddingItemCat] = useState(null)
  const [newItemLabel, setNewItemLabel] = useState('')
  const newItemRef = useRef()

  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatColor, setNewCatColor] = useState('#059669')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const plan = budgetPlanning?.[selectedMonth]
  const workingValues = values || plan

  // ── Catégories ─────────────────────────────────────────────────────────────

  const startRenameCat = (e, cat) => {
    e.stopPropagation()
    setEditingCat(cat.id)
    setEditCatLabel(cat.label)
    setTimeout(() => catInputRef.current?.focus(), 50)
  }

  const saveRenameCat = async (catId) => {
    if (!editCatLabel.trim()) { setEditingCat(null); return }
    const updated = (categories||[]).map(c => c.id===catId ? {...c,label:editCatLabel.trim()} : c)
    await updateCategories(updated)
    setEditingCat(null)
  }

  const deleteCat = async (e, catId) => {
    e.stopPropagation()
    if (!window.confirm('Supprimer cette catégorie ?')) return
    await updateCategories((categories||[]).filter(c => c.id!==catId))
  }

  const addCategory = async () => {
    if (!newCatLabel.trim()) return
    const newCat = { id: uid(), label: newCatLabel.trim(), icon: 'Tag', type: 'expense', isFixed: false, color: newCatColor, items: [] }
    await updateCategories([...(categories||[]), newCat])
    setNewCatLabel(''); setNewCatColor('#059669'); setShowAddCat(false)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = (categories||[]).findIndex(c => c.id===active.id)
    const newIndex = (categories||[]).findIndex(c => c.id===over.id)
    const reordered = arrayMove(categories||[], oldIndex, newIndex)
    await updateCategories(reordered)
  }

  // ── Items ──────────────────────────────────────────────────────────────────

  const startRenameItem = (e, catId, item) => {
    e.stopPropagation()
    setEditingItem({ catId, itemId: item.id })
    setEditItemLabel(item.label)
    setTimeout(() => itemInputRef.current?.focus(), 50)
  }

  const saveRenameItem = async () => {
    if (!editItemLabel.trim() || !editingItem) { setEditingItem(null); return }
    const updated = (categories||[]).map(c =>
      c.id===editingItem.catId
        ? {...c, items: (c.items||[]).map(it => it.id===editingItem.itemId ? {...it,label:editItemLabel.trim()} : it)}
        : c
    )
    await updateCategories(updated)
    setEditingItem(null)
  }

  const deleteItem = async (e, catId, itemId) => {
    e.stopPropagation()
    if (!window.confirm('Supprimer cette ligne ?')) return
    const updated = (categories||[]).map(c =>
      c.id===catId ? {...c, items:(c.items||[]).filter(it => it.id!==itemId)} : c
    )
    await updateCategories(updated)
  }

  const startAddItem = (e, catId) => {
    e.stopPropagation()
    setAddingItemCat(catId); setNewItemLabel('')
    setTimeout(() => newItemRef.current?.focus(), 50)
  }

  const saveAddItem = async (catId) => {
    if (!newItemLabel.trim()) { setAddingItemCat(null); return }
    const newItem = { id: uid(), label: newItemLabel.trim(), isFixed: false }
    const updated = (categories||[]).map(c =>
      c.id===catId ? {...c, items:[...(c.items||[]), newItem]} : c
    )
    await updateCategories(updated)
    setAddingItemCat(null); setNewItemLabel('')
  }

  // ── Budget montants ────────────────────────────────────────────────────────

  // Modifie la valeur d'une ligne SANS recalculer le total automatiquement
  const handleChangeItemVal = (catId, itemId, newVal) => {
    const current = workingValues || plan || {}
    setValues({
      ...current,
      categories: {
        ...(current.categories||{}),
        [catId]: {
          ...(current.categories?.[catId]||{}),
          items: {
            ...(current.categories?.[catId]?.items||{}),
            [itemId]: parseFloat(newVal)||0
          }
        }
      }
    })
  }

  // Modifie le total directement (accepte un nombre ou la somme des items)
  const handleChangeCatTotal = (catId, newVal) => {
    const current = workingValues || plan || {}
    setValues({
      ...current,
      categories: {
        ...(current.categories||{}),
        [catId]: {
          ...(current.categories?.[catId]||{}),
          total: parseFloat(newVal)||0
        }
      }
    })
  }

  const saveBudget = async () => {
    if (!workingValues) return
    setSaving(true)
    await updateBudget(selectedMonth, workingValues)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setValues(null)
  }

  const grandTotal = Object.values(workingValues?.categories||{})
    .reduce((s,c) => s+(c.total||0), 0)

  const catIds = (categories||[]).map(c => c.id)

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1">Configuration</p>
        <h1 className="text-2xl font-black text-slate-800">Budget prévu</h1>
        <p className="text-sm text-slate-400">Glissez pour réordonner • ✏️ renommer • 🗑️ supprimer</p>
      </div>

      {/* Sélecteur mois */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-5 gap-1">
        {months.map(m => (
          <button key={m} onClick={() => { setSelectedMonth(m); setValues(null) }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all
              ${selectedMonth===m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {monthLabels[m]}
          </button>
        ))}
      </div>

      {/* Total général */}
      <div className="card bg-gradient-to-br from-blue-600 to-blue-700 text-white mb-5 border-0 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Total prévu — {monthLabels[selectedMonth]}</p>
        <p className="text-3xl font-black">{fmt(grandTotal)}</p>
        <p className="text-xs text-blue-200 mt-1">= somme des totaux de chaque catégorie</p>
      </div>

      {/* Liste triable */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={catIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 mb-4">
            {(categories||[]).map(cat => (
              <SortableCategory
                key={cat.id}
                cat={cat}
                catData={workingValues?.categories?.[cat.id]}
                isExpanded={!!expanded[cat.id]}
                onToggle={id => setExpanded(e => ({...e,[id]:!e[id]}))}

                editingCat={editingCat}
                editCatLabel={editCatLabel}
                setEditCatLabel={setEditCatLabel}
                catInputRef={catInputRef}
                onStartRenameCat={startRenameCat}
                onSaveRenameCat={saveRenameCat}
                onCancelRenameCat={() => setEditingCat(null)}
                onDeleteCat={deleteCat}

                editingItem={editingItem}
                editItemLabel={editItemLabel}
                setEditItemLabel={setEditItemLabel}
                itemInputRef={itemInputRef}
                onStartRenameItem={startRenameItem}
                onSaveRenameItem={saveRenameItem}
                onCancelRenameItem={() => setEditingItem(null)}
                onDeleteItem={deleteItem}

                addingItemCat={addingItemCat}
                newItemLabel={newItemLabel}
                setNewItemLabel={setNewItemLabel}
                newItemRef={newItemRef}
                onStartAddItem={startAddItem}
                onSaveAddItem={saveAddItem}
                onCancelAddItem={() => setAddingItemCat(null)}

                onChangeCatTotal={handleChangeCatTotal}
                onChangeItemVal={handleChangeItemVal}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Ajouter une catégorie */}
      {showAddCat ? (
        <div className="card mb-4 border-2 border-blue-200 bg-blue-50">
          <p className="text-sm font-bold text-slate-700 mb-3">Nouvelle catégorie</p>
          <input value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter') addCategory(); if (e.key==='Escape') setShowAddCat(false) }}
            className="input text-sm w-full mb-3" placeholder="Nom de la catégorie..." />
          <p className="text-xs text-slate-500 mb-2">Couleur :</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map(color => (
              <button key={color} onClick={() => setNewCatColor(color)}
                className={`w-7 h-7 rounded-full transition-all ${newCatColor===color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110':''}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addCategory}
              className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1">
              <Check size={14} /> Créer
            </button>
            <button onClick={() => setShowAddCat(false)}
              className="flex-1 py-2 rounded-xl bg-slate-200 text-slate-700 text-sm font-bold">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddCat(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-semibold text-sm flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-500 transition-colors mb-4">
          <Plus size={18} /> Ajouter une catégorie
        </button>
      )}

      {/* Sauvegarder */}
      <div className="sticky bottom-20">
        <button onClick={saveBudget} disabled={saving}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all
            ${saved ? 'bg-green-500 text-white' : 'btn-primary'}`}>
          {saving ? <><Loader size={16} className="animate-spin"/>Enregistrement...</>
           : saved ? '✓ Enregistré!'
           : <><Save size={16}/>Enregistrer le budget</>}
        </button>
      </div>
    </div>
  )
}
