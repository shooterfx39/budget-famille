/**
 * Couche données — Supabase cloud
 * Toutes les opérations font un read-modify-write sur une seule ligne JSONB.
 * Le document est petit (~quelques Ko) donc c'est parfaitement acceptable.
 */
import { supabase } from './supabase'
import initialData from '../data/initialData.json'

const ROW_ID = 1

// ─── Lecture ────────────────────────────────────────────────────────────────

export async function getData() {
  const { data, error } = await supabase
    .from('budget')
    .select('data')
    .eq('id', ROW_ID)
    .single()

  if (error || !data?.data || Object.keys(data.data).length === 0) {
    // Première utilisation : on sème les données initiales
    await supabase.from('budget').upsert({ id: ROW_ID, data: initialData })
    return initialData
  }
  return data.data
}

// ─── Écriture complète ───────────────────────────────────────────────────────

export async function saveData(newData) {
  const { error } = await supabase
    .from('budget')
    .upsert({ id: ROW_ID, data: newData, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ─── Opérations granulaires (read-modify-write) ──────────────────────────────

async function patch(fn) {
  const current = await getData()
  const updated = fn(current)
  await saveData(updated)
  return updated
}

export async function addTransaction(month, transaction) {
  await patch(d => {
    if (!d.transactions[month]) d.transactions[month] = []
    d.transactions[month] = [...d.transactions[month], transaction]
    return d
  })
  return { ok: true, transaction }
}

export async function deleteTransaction(month, id) {
  await patch(d => {
    if (d.transactions[month]) {
      d.transactions[month] = d.transactions[month].filter(t => t.id !== id)
    }
    return d
  })
}

export async function updateIncome(month, income) {
  await patch(d => { d.income[month] = income; return d })
}

export async function updateBudget(month, budget) {
  await patch(d => {
    if (!d.budgetPlanning) d.budgetPlanning = {}
    d.budgetPlanning[month] = budget
    return d
  })
}

export async function updateCategories(categories) {
  await patch(d => { d.categories = categories; return d })
}

// ─── OCR reçu (Vercel serverless function) ───────────────────────────────────

export async function scanReceipt(imageBase64, mediaType) {
  const r = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType })
  })
  return r.json()
}
