import { useCallback, useSyncExternalStore } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Building2,
  FileCheck,
  Flag,
  CreditCard,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import logo from '@/assets/logo.png'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Users', path: '/users', icon: Users },
  { label: 'Partners', path: '/partners', icon: Building2 },
  { label: 'License Approvals', path: '/license-approvals', icon: FileCheck },
  { label: 'Reports', path: '/reports', icon: Flag },
  { label: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
  { label: 'Settings', path: '/settings', icon: Settings },
]

function resolveAvatar(url: string | null | undefined) {
  if (!url) return null
  if (url.startsWith('http')) return url
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  return base.replace(/\/api\/?$/, '') + url
}

const originalSetItem = localStorage.setItem.bind(localStorage)
const listeners = new Set<() => void>()

localStorage.setItem = (key: string, value: string) => {
  originalSetItem(key, value)
  if (key === 'adminInfo') {
    listeners.forEach((fn) => fn())
  }
}

function useAdminInfo(): Record<string, string> {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  }, [])

  const getSnapshot = useCallback(() => {
    return localStorage.getItem('adminInfo') || '{}'
  }, [])

  const raw = useSyncExternalStore(subscribe, getSnapshot)

  try {
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

function AdminLayout() {
  const navigate = useNavigate()
  const admin = useAdminInfo()
  const initial = (admin.fullName || admin.username || 'A').charAt(0).toUpperCase()
  const roleLabel = admin.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator'
  const avatarUrl = resolveAvatar(admin.avatar)

  const handleLogout = async () => {
    try {
      await api.post('/admin/auth/logout')
    } catch {
      // ignore – clear locally regardless
    } finally {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminInfo')
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">

      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-slate-900 shadow-xl shadow-black/10">

        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/5 px-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-md shadow-blue-900/50">
            <img src={logo} alt="BusNet" className="h-5 w-auto" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            BusNet Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 mt-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Menu
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                        : 'text-slate-400 hover:bg-white/6 hover:text-slate-100',
                    )
                  }
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User + logout */}
        <div className="shrink-0 border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            {/* Avatar */}
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover shadow" />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white shadow">
                {initial}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-200">
                {admin.fullName || admin.username || 'Administrator'}
              </p>
              <p className="truncate text-[10px] text-slate-500">{roleLabel}</p>
            </div>

            <button
              onClick={handleLogout}
              title="Sign out"
              className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="ml-64 flex min-h-screen flex-1 flex-col">

        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-slate-200 bg-white/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-800">Admin Console</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400">BusNet Management</span>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
