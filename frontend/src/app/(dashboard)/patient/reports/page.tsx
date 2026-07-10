"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { FileText, Download, Calendar, Activity, Loader2 } from 'lucide-react'

export default function PatientReports() {
  const { profile } = useAuth()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchReports() {
      if (!profile) return

      try {
        // Fetch predictions for the patient that have reports
        const { data: predictions, error } = await supabase
          .from('predictions')
          .select(`
            id,
            created_at,
            risk_score,
            status,
            reports (
              id,
              pdf_storage_path
            )
          `)
          .eq('patient_id', profile.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        
        setReports(predictions || [])
      } catch (err) {
        console.error("Error fetching reports:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [profile, supabase])

  const downloadReport = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .createSignedUrl(path, 60)
        
      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      console.error("Error downloading report:", err)
      alert("Could not download report.")
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Reports</h1>
          <p className="text-slate-400">View and download your generated clinical reports.</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No Reports Found</h3>
          <p className="text-slate-400 max-w-sm">
            You don't have any generated clinical reports yet. Complete a new assessment to generate one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((pred) => {
            const hasReport = pred.reports && pred.reports.length > 0;
            return (
              <div key={pred.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Activity className="w-6 h-6" />
                  </div>
                  {pred.risk_score !== null && (
                    <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                      Risk Score: {(pred.risk_score * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-medium text-white mb-1">
                  Cardiovascular Assessment
                </h3>
                
                <div className="flex items-center text-slate-400 text-sm mb-6">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(pred.created_at).toLocaleDateString()}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  {hasReport ? (
                    <button 
                      onClick={() => downloadReport(pred.reports[0].pdf_storage_path)}
                      className="w-full flex items-center justify-center py-2 px-4 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors font-medium text-sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </button>
                  ) : (
                    <button disabled className="w-full flex items-center justify-center py-2 px-4 bg-slate-800/50 text-slate-500 rounded-lg cursor-not-allowed font-medium text-sm">
                      Report Processing...
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
