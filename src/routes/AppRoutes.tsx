import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'
import AdminLayout from '@/layouts/AdminLayout'
import DashboardPage from '@/pages/DashboardPage'
import UsersPage from '@/pages/UsersPage'
import PartnersPage from '@/pages/PartnersPage'
import LicenseApprovalsPage from '@/pages/LicenseApprovalsPage'
import ReportsPage from '@/pages/ReportsPage'
import SubscriptionsPage from '@/pages/SubscriptionsPage'
import SettingsPage from '@/pages/SettingsPage'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import NotFoundPage from '@/pages/NotFoundPage'

function RequireAuth() {
  const token = localStorage.getItem('adminToken')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function RedirectIfAuth() {
  const token = localStorage.getItem('adminToken')

  if (token) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuth />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
    ],
  },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'users',
            element: <UsersPage />,
          },
          {
            path: 'partners',
            element: <PartnersPage />,
          },
          {
            path: 'license-approvals',
            element: <LicenseApprovalsPage />,
          },
          {
            path: 'reports',
            element: <ReportsPage />,
          },
          {
            path: 'subscriptions',
            element: <SubscriptionsPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
