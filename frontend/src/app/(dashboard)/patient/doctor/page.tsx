"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Users, Mail, Phone, MapPin, Loader2, Link2 } from 'lucide-react'

export default function MyDoctorPage() {
  const { profile } = useAuth()
  const [doctor, setDoctor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDoctor() {
      if (!profile) return

      try {
        // Fetch doctor_patient_links where patient_id matches
        const { data: link, error: linkError } = await supabase
          .from('doctor_patient_links')
          .select('doctor_id')
          .eq('patient_id', profile.id)
          .eq('status', 'active')
          .single()

        if (linkError && linkError.code !== 'PGRST116') {
          throw linkError
        }

        if (link?.doctor_id) {
          const { data: docProfile, error: docError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', link.doctor_id)
            .single()
            
          if (docError) throw docError
          setDoctor(docProfile)
        }
      } catch (err: any) {
        console.error("Error fetching doctor:", err)
        setErrorStr(err.message || "Failed to load doctor information.")
      } finally {
        setLoading(false)
      }
    }

    fetchDoctor()
  }, [profile, supabase])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Clinical Team</h1>
        <p className="text-slate-400">View information about your assigned cardiologist and care team.</p>
      </div>

      {errorStr && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl">
          {errorStr}
        </div>
      )}

      {doctor ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 p-1 shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                <Users className="w-10 h-10 text-emerald-400" />
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 mb-2 border border-emerald-500/20">
                  Primary Cardiologist
                </div>
                <h2 className="text-2xl font-bold text-white">Dr. {doctor.full_name}</h2>
                {doctor.metadata?.specialty && (
                  <p className="text-slate-400">{doctor.metadata.specialty}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="flex items-center text-slate-300">
                  <Mail className="w-5 h-5 text-slate-500 mr-3" />
                  <a href={`mailto:${doctor.email}`} className="hover:text-emerald-400 transition-colors">
                    {doctor.email}
                  </a>
                </div>
                {doctor.metadata?.phone && (
                  <div className="flex items-center text-slate-300">
                    <Phone className="w-5 h-5 text-slate-500 mr-3" />
                    {doctor.metadata.phone}
                  </div>
                )}
                {doctor.metadata?.clinic_address && (
                  <div className="flex items-center text-slate-300 sm:col-span-2">
                    <MapPin className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                    <span>{doctor.metadata.clinic_address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
            <Link2 className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-3">No Doctor Assigned</h3>
          <p className="text-slate-400 max-w-md mb-8">
            You are not currently linked to a cardiologist in the system. When a doctor requests access to your profile, you will be able to review and approve the connection here.
          </p>
          <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-medium shadow-lg shadow-emerald-900/20">
            Find a Cardiologist
          </button>
        </div>
      )}
    </div>
  )
}
