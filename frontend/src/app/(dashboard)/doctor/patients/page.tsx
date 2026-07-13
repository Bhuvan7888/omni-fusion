"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Users, Search, Activity, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Profile } from '@/lib/types'

export default function DoctorPatientsPage() {
  const { profile } = useAuth()
  const [patients, setPatients] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [doctorCode, setDoctorCode] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    async function fetchPatients() {
      if (!profile) return

      try {
        const [links, code] = await Promise.all([api.getPatients(), api.getDoctorCode()])
        setPatients((links || []).filter((link) => link.status === 'accepted').map((link) => link.profiles))
        setDoctorCode(code.code)
      } catch (err) {
        console.error("Error fetching patients:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
  }, [profile])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Patients</h1>
          <p className="text-slate-400">Manage and monitor your linked patients.</p>
        </div>
        <div className="relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search patients..." 
            className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 w-64"
          />
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No Patients Found</h3>
          <p className="text-slate-400 max-w-sm mb-6">
            You don't have any patients linked to your account yet. Have your patients enter your Doctor ID during their onboarding, or invite them via email.
          </p>
          <button onClick={() => setShowInvite(!showInvite)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium">
            Invite Patient
          </button>
          {showInvite && <div className="mt-5 w-full max-w-sm rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-sm font-semibold text-slate-300">Share your doctor code</p><button onClick={() => navigator.clipboard.writeText(doctorCode)} className="mt-2 w-full bg-white border border-slate-800 rounded-xl px-4 py-3 font-mono font-bold text-emerald-600">{doctorCode} · Copy</button><p className="text-xs text-slate-500 mt-2">The patient enters this under My Doctor and is connected immediately.</p></div>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <Link href={`/doctor/patients/${patient.id}`} key={patient.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors group cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                    {patient.fullName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{patient.fullName}</h3>
                    <p className="text-slate-500 text-sm truncate w-32">{patient.email}</p>
                  </div>
                </div>
                <div className="p-2 bg-slate-800/50 rounded-lg group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors text-slate-400">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-400 pt-4 border-t border-slate-800/50 mt-4">
                <span>View recent scans</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
