"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Loader2, ArrowLeft, FileText, User, Calendar, Activity, Plus } from 'lucide-react'
import Link from 'next/link'

export default function PatientDetailsPage() {
  const { id } = useParams()
  const patientId = id as string
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [patient, setPatient] = useState<any>(null)
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [noteText, setNoteText] = useState('')
  const [activePredictionId, setActivePredictionId] = useState<string | null>(null)
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!profile || !patientId) return

      try {
        // 1. Verify link and fetch patient profile
        const { data: link, error: linkError } = await supabase
          .from('doctor_patient_links')
          .select(`
            status,
            profiles:patient_id (
              id, full_name, email, age, gender, bmi, smoking_status
            )
          `)
          .eq('doctor_id', profile.id)
          .eq('patient_id', patientId)
          .single()

        if (linkError || link?.status !== 'accepted') {
          router.push('/doctor/patients')
          return
        }

        setPatient(link.profiles)

        // 2. Fetch patient's predictions and associated doctor notes
        const { data: preds, error: predError } = await supabase
          .from('predictions')
          .select(`
            id, created_at, risk_score, streams_used,
            reports ( id, pdf_storage_path ),
            doctor_notes ( id, note, created_at )
          `)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })

        if (predError) throw predError
        setPredictions(preds || [])

      } catch (err) {
        console.error("Error loading patient details:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [patientId, profile, router, supabase])

  const handleSaveNote = async () => {
    if (!activePredictionId || !noteText.trim()) return
    setSavingNote(true)

    try {
      const { error } = await supabase
        .from('doctor_notes')
        .insert({
          prediction_id: activePredictionId,
          doctor_id: profile!.id,
          note: noteText,
          priority: 'normal'
        })

      if (error) throw error

      // Optimistically update UI
      setPredictions(prev => prev.map(p => {
        if (p.id === activePredictionId) {
          return {
            ...p,
            doctor_notes: [...(p.doctor_notes || []), { note: noteText, created_at: new Date().toISOString() }]
          }
        }
        return p
      }))
      
      setNoteText('')
      setActivePredictionId(null)
    } catch (err) {
      console.error("Error saving note:", err)
      alert("Failed to save note.")
    } finally {
      setSavingNote(false)
    }
  }

  const downloadReport = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('reports').createSignedUrl(path, 60)
      if (error) throw error
      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error(err)
      alert("Could not download report.")
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <Link href="/doctor/patients" className="inline-flex items-center text-sm text-slate-400 hover:text-blue-400 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Patients
      </Link>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-lg">
        <div className="w-20 h-20 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
          <User className="w-10 h-10" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-white mb-2">{patient?.full_name}</h1>
          <p className="text-slate-400">{patient?.email}</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Age</p>
            <p className="text-lg font-medium text-slate-200">{patient?.age || '--'}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">BMI</p>
            <p className="text-lg font-medium text-slate-200">{patient?.bmi || '--'}</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center">
        <Activity className="w-5 h-5 mr-2 text-emerald-400" />
        Clinical Assessments
      </h2>

      {predictions.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-slate-500">No assessments found for this patient.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {predictions.map(pred => {
            const hasReport = pred.reports && pred.reports.length > 0
            const hasNotes = pred.doctor_notes && pred.doctor_notes.length > 0
            
            return (
              <div key={pred.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center text-slate-400 text-sm mb-2">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(pred.created_at).toLocaleString()}
                    </div>
                    <h3 className="text-lg font-medium text-white">
                      Risk Score: {(pred.risk_score * 100).toFixed(1)}%
                    </h3>
                  </div>
                  {hasReport && (
                    <button 
                      onClick={() => downloadReport(pred.reports[0].pdf_storage_path)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View AI Report
                    </button>
                  )}
                </div>

                {/* Doctor Notes Section */}
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Clinical Notes</h4>
                  
                  {hasNotes ? (
                    <div className="space-y-3 mb-4">
                      {pred.doctor_notes.map((n: any, idx: number) => (
                        <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-slate-300 text-sm">
                          {n.note}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm italic mb-4">No notes added yet.</p>
                  )}

                  {activePredictionId === pred.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Type your clinical observation or recommendation here..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 text-sm focus:outline-none focus:border-blue-500 min-h-[100px]"
                      />
                      <div className="flex justify-end space-x-3">
                        <button 
                          onClick={() => { setActivePredictionId(null); setNoteText(''); }}
                          className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSaveNote}
                          disabled={savingNote || !noteText.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                        >
                          {savingNote && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Save Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setActivePredictionId(pred.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Note
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
