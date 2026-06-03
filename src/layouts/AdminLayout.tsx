import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Building2,
  Flag,
  CreditCard,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Users',
    path: '/users',
    icon: Users,
  },
  {
    label: 'Partners',
    path: '/partners',
    icon: Building2,
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: Flag,
  },
  {
    label: 'Subscriptions',
    path: '/subscriptions',
    icon: CreditCard,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
  },
]

function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed left-0 top-0 h-screen w-64 border-r bg-white">
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/" className="text-xl font-bold text-blue-600">
            BusNet Admin
          </Link>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div className="ml-64 min-h-screen">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-6">
          <div>
            <h1 className="text-lg font-semibold">Admin Panel</h1>
            <p className="text-sm text-slate-500">
              Manage BusNet system data
            </p>
          </div>

          <button className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50">
            <LogOut size={16} />
            Logout
          </button>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout