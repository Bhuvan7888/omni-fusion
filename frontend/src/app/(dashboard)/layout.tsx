"use client"

import { useAuth } from '@/components/auth/AuthProvider'
import { RoleGuard } from '@/components/auth/RoleGuard'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, LayoutDashboard, Users, FileText, Settings, LogOut, FilePlus, Bell } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()

  const isPatient = profile?.role === 'PATIENT'

  const patientLinks = [
    { name: 'Dashboard', href: '/patient', icon: LayoutDashboard },
    { name: 'New Assessment', href: '/patient/assessment/new', icon: FilePlus },
    { name: 'Reports', href: '/patient/reports', icon: FileText },
    { name: 'My Doctor', href: '/patient/doctor', icon: Users },
  ]

  const doctorLinks = [
    { name: 'Overview', href: '/doctor', icon: LayoutDashboard },
    { name: 'Patients', href: '/doctor/patients', icon: Users },
    { name: 'Analytics', href: '/doctor/analytics', icon: Activity },
  ]

  const links = isPatient ? patientLinks : doctorLinks

  return (
    <RoleGuard allowedRoles={['PATIENT', 'DOCTOR']}>
      <div className="flex h-screen bg-slate-950 text-slate-200">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
          <div className="h-16 flex items-center px-6 border-b border-slate-800">
            <Activity className="w-6 h-6 text-emerald-400 mr-3" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Omni-Fusion
            </span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-500 mb-4 px-2 uppercase tracking-wider">
              {isPatient ? 'Patient Portal' : 'Clinical Portal'}
            </p>
            <nav className="space-y-1">
              {links.map(link => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
                const Icon = link.icon
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-600/10 text-blue-400 font-medium' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {link.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-slate-500">{isPatient ? 'Patient' : 'Doctor'}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center w-full px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 z-10">
            <div className="md:hidden">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1" />
            <div className="flex items-center space-x-4">
              <button className="p-2 text-slate-400 hover:text-slate-200 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            </div>
          </header>
          
          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
