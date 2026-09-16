import { Outlet } from 'react-router-dom'
import { Topbar } from './Topbar'

export default function DashboardLayout() {
  return (
    <div className="min-h-screen">
      <Topbar />
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
