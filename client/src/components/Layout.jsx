import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, SlidersHorizontal, BarChart3, Settings, PlusCircle } from 'lucide-react'

const NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau' },
  { path: '/budget', icon: SlidersHorizontal, label: 'Budget' },
  { path: '/ajouter', icon: PlusCircle, label: 'Ajouter', primary: true },
  { path: '/analytiques', icon: BarChart3, label: 'Analyses' },
  { path: '/parametres', icon: Settings, label: 'Réglages' },
]

export default function Layout({ children }) {
  const loc = useLocation()
  const nav = useNavigate()

  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto">
      <main className="flex-1 pb-safe overflow-y-auto">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-end justify-around px-2 py-2">
          {NAV.map(({ path, icon: Icon, label, primary }) => {
            const active = primary
              ? loc.pathname === path
              : loc.pathname === path || loc.pathname.startsWith(path + '/')

            if (primary) return (
              <button key={path} onClick={() => nav(path)}
                className="flex flex-col items-center -mt-5">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all
                  ${active ? 'bg-blue-700 scale-105' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  <Icon size={26} className="text-white" />
                </div>
                <span className="text-[10px] font-semibold text-blue-600 mt-1">{label}</span>
              </button>
            )

            return (
              <button key={path} onClick={() => nav(path)}
                className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors">
                <Icon size={22} className={active ? 'text-blue-600' : 'text-slate-400'} />
                <span className={`text-[10px] font-semibold ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
