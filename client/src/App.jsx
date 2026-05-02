import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import MonthView from './components/MonthView'
import CategoryView from './components/CategoryView'
import AddTransaction from './components/AddTransaction'
import Analytics from './components/Analytics'
import BudgetSetup from './components/BudgetSetup'
import Settings from './components/Settings'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mois/:month" element={<MonthView />} />
            <Route path="/mois/:month/categorie/:categoryId" element={<CategoryView />} />
            <Route path="/ajouter" element={<AddTransaction />} />
            <Route path="/analytiques" element={<Analytics />} />
            <Route path="/budget" element={<BudgetSetup />} />
            <Route path="/parametres" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  )
}
