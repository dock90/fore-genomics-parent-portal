import { redirect } from 'next/navigation'
import { checkRole } from '@/utils/roles'
import { AdminNavigation } from './AdminNavigation'
import { AdminHeader } from '@/components/AdminHeader'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!checkRole('ADMIN')) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar Navigation */}
        <AdminNavigation />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Admin Header */}
          <AdminHeader />
          
          {/* Page Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
} 