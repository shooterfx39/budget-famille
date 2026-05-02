import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../utils/supabase'
import {
  getData, saveData,
  addTransaction as apiAdd,
  deleteTransaction as apiDelete,
  updateIncome as apiIncome,
  updateBudget as apiBudget,
  updateCategories as apiUpdateCategories
} from '../utils/api'

const AppContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { ...state, ...action.data, loading: false, lastSync: Date.now() }
    case 'ADD_TRANSACTION': {
      const { month, transaction } = action
      return {
        ...state,
        transactions: {
          ...state.transactions,
          [month]: [...(state.transactions?.[month] || []), transaction]
        }
      }
    }
    case 'DELETE_TRANSACTION': {
      const { month, id } = action
      return {
        ...state,
        transactions: {
          ...state.transactions,
          [month]: (state.transactions?.[month] || []).filter(t => t.id !== id)
        }
      }
    }
    case 'UPDATE_INCOME':
      return { ...state, income: { ...state.income, [action.month]: action.income } }
    case 'UPDATE_BUDGET':
      return {
        ...state,
        budgetPlanning: { ...state.budgetPlanning, [action.month]: action.budget }
      }
    case 'UPDATE_CATEGORIES':
      return { ...state, categories: action.categories }
    case 'SYNC_ERROR':
      return { ...state, syncError: action.error }
    default:
      return state
  }
}

const initialState = {
  loading: true,
  config: null,
  categories: [],
  budgetPlanning: {},
  income: {},
  transactions: {},
  lastSync: null,
  syncError: null
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const loadingRef = useRef(false)

  // ─── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    if (loadingRef.current) return
    loadingRef.current = true

    getData()
      .then(data => dispatch({ type: 'LOAD', data }))
      .catch(err => {
        console.error('Erreur chargement données:', err)
        dispatch({ type: 'SYNC_ERROR', error: err.message })
      })
  }, [])

  // ─── Sync temps réel entre appareils (Supabase Realtime) ───────────────────
  useEffect(() => {
    const channel = supabase
      .channel('budget-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'budget', filter: 'id=eq.1' },
        payload => {
          if (payload.new?.data) {
            dispatch({ type: 'LOAD', data: payload.new.data })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ─── Actions ────────────────────────────────────────────────────────────────
  const addTransaction = useCallback(async (month, transaction) => {
    await apiAdd(month, transaction)
    dispatch({ type: 'ADD_TRANSACTION', month, transaction })
  }, [])

  const removeTransaction = useCallback(async (month, id) => {
    await apiDelete(month, id)
    dispatch({ type: 'DELETE_TRANSACTION', month, id })
  }, [])

  const updateIncome = useCallback(async (month, income) => {
    await apiIncome(month, income)
    dispatch({ type: 'UPDATE_INCOME', month, income })
  }, [])

  const updateBudget = useCallback(async (month, budget) => {
    await apiBudget(month, budget)
    dispatch({ type: 'UPDATE_BUDGET', month, budget })
  }, [])

  const updateCategories = useCallback(async (categories) => {
    await apiUpdateCategories(categories)
    dispatch({ type: 'UPDATE_CATEGORIES', categories })
  }, [])

  // ─── Export / Import ────────────────────────────────────────────────────────
  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-famille-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state])

  const importData = useCallback(async (jsonData) => {
    await saveData(jsonData)
    dispatch({ type: 'LOAD', data: jsonData })
  }, [])

  return (
    <AppContext.Provider value={{
      ...state,
      months: state.config?.period?.months || [],
      monthLabels: state.config?.period?.labels || {},
      addTransaction, removeTransaction, updateIncome, updateBudget, updateCategories,
      exportData, importData
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
