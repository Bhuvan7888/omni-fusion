"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

export function RoleGuard({ 
  children, 
  allowedRoles,
  redirectTo = '/login'
}: { 
  children: React.ReactNode
  allowedRoles: string[]
  redirectTo?: string
}) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo)
      } else if (profile && !allowedRoles.includes(profile.role)) {
        // Unauth for this role, send them to their dashboard
        router.push(`/dashboard/${profile.role.toLowerCase()}`)
      } else if (!profile) {
        // Needs onboarding
        router.push('/onboarding/patient') // Default fallback, but they might need to choose
      }
    }
  }, [user, profile, loading, allowedRoles, redirectTo, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <p className="animate-pulse">Authenticating...</p>
      </div>
    )
  }

  if (!user || (profile && !allowedRoles.includes(profile.role))) {
    return null
  }

  return <>{children}</>
}
