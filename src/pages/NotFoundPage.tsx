import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="mt-2 text-slate-500">Page not found</p>

      <Button asChild className="mt-6">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  )
}

export default NotFoundPage