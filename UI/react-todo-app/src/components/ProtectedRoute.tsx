
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAuth, hasAnyRole } from '../auth/auth'

export default function ProtectedRoute({ roles }: { roles: string[] }) {
  const auth = getAuth()
  const location = useLocation()
  if (!auth?.token) return <Navigate to="/login" state={{ from: location }} replace />
  if (!hasAnyRole(roles)) return <Navigate to="/" replace />
  return <Outlet />
}
