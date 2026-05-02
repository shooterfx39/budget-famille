export const fmt = (n) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(n || 0)

export const pct = (used, total) => (total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0)

export const statusColor = (p) => {
  if (p >= 100) return { bar: 'bg-red-500', text: 'text-red-600', badge: 'badge-red', border: 'border-red-200' }
  if (p >= 80)  return { bar: 'bg-amber-400', text: 'text-amber-600', badge: 'badge-amber', border: 'border-amber-200' }
  return { bar: 'bg-green-500', text: 'text-green-600', badge: 'badge-green', border: 'border-green-200' }
}

// Total planned for a month across all categories
export function totalPrevu(budgetPlanning, month) {
  const plan = budgetPlanning?.[month]
  if (!plan) return 0
  return Object.values(plan.categories || {}).reduce((s, c) => s + (c.total || 0), 0)
}

// Total actual spent in a month from transactions
export function totalReel(transactions, month) {
  return (transactions?.[month] || []).reduce((s, t) => s + (t.total || 0), 0)
}

// Spent in a specific category for a month
export function spentInCategory(transactions, month, categoryId) {
  return (transactions?.[month] || [])
    .filter(t => t.category === categoryId)
    .reduce((s, t) => s + (t.total || 0), 0)
}

// Income totals
export function totalIncomePrevu(budgetPlanning, month) {
  const inc = budgetPlanning?.[month]?.income || {}
  return Object.values(inc).reduce((s, v) => s + (v || 0), 0)
}

export function totalIncomeReel(income, month) {
  const inc = income?.[month] || {}
  return Object.values(inc).reduce((s, v) => s + (v || 0), 0)
}

// Group transaction items by name (for comparison across months)
export function groupItemsByName(transactions, month) {
  const result = {}
  for (const tx of (transactions?.[month] || [])) {
    for (const item of (tx.items || [])) {
      const key = item.name.toLowerCase().trim()
      if (!result[key]) result[key] = { name: item.name, entries: [] }
      result[key].entries.push({
        date: tx.date, store: tx.store,
        quantity: item.quantity, unit: item.unit,
        unitPrice: item.unitPrice, total: item.total
      })
    }
  }
  return result
}

// Compare same item across two months
export function compareItem(itemName, transactions, monthA, monthB) {
  const groupA = groupItemsByName(transactions, monthA)
  const groupB = groupItemsByName(transactions, monthB)
  const key = itemName.toLowerCase().trim()
  const a = groupA[key]
  const b = groupB[key]
  if (!a || !b) return null

  const totalQtyA = a.entries.reduce((s, e) => s + e.quantity, 0)
  const totalQtyB = b.entries.reduce((s, e) => s + e.quantity, 0)
  const avgPriceA = a.entries.reduce((s, e) => s + e.unitPrice, 0) / a.entries.length
  const avgPriceB = b.entries.reduce((s, e) => s + e.unitPrice, 0) / b.entries.length

  return {
    qtyChange: totalQtyB - totalQtyA,
    priceChange: avgPriceB - avgPriceA,
    pricePctChange: avgPriceA > 0 ? ((avgPriceB - avgPriceA) / avgPriceA) * 100 : 0
  }
}

// Get all unique item names across all months
export function getAllItemNames(transactions) {
  const names = new Set()
  for (const month of Object.keys(transactions || {})) {
    for (const tx of (transactions[month] || [])) {
      for (const item of (tx.items || [])) {
        names.add(item.name.trim())
      }
    }
  }
  return [...names].sort()
}

// Monthly spending by category for analytics
export function monthlyByCategory(transactions, months) {
  return months.map(month => {
    const row = { month }
    for (const tx of (transactions?.[month] || [])) {
      row[tx.category] = (row[tx.category] || 0) + tx.total
    }
    return row
  })
}

// 4-month grand totals
export function fourMonthSummary(budgetPlanning, transactions, months) {
  let prevu = 0, reel = 0
  for (const m of months) {
    prevu += totalPrevu(budgetPlanning, m)
    reel += totalReel(transactions, m)
  }
  return { prevu, reel, ecart: prevu - reel, pct: pct(reel, prevu) }
}
