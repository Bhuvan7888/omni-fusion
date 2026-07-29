"use client"

import Link from 'next/link'
import { Activity, ShieldCheck, Stethoscope, ChevronRight } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <Activity className="w-8 h-8 text-emerald-400" />
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Omni-Fusion
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <button onClick={handleLogout} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Sign Out
              </button>
              <Link href={profile?.role === 'DOCTOR' ? '/doctor' : '/patient'} className="text-sm font-medium px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all shadow-lg shadow-emerald-900/20">
                Go to Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Log In
              </Link>
              <Link href="/signup" className="text-sm font-medium px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-lg shadow-blue-900/20">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl w-full text-center space-y-8 z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 text-sm font-medium text-emerald-400 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Platform Extension V2 Live</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
            The Future of <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Cardiovascular Intelligence
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Omni-Fusion seamlessly integrates multimodal patient data—combining ECG waveforms, vitals, and longitudinal history—to deliver precise, AI-driven clinical insights.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            {user ? (
              <Link href={profile?.role === 'DOCTOR' ? '/doctor' : '/patient'} className="group flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-emerald-500 text-white font-semibold rounded-full hover:bg-emerald-400 transition-all hover:scale-105">
                Go to your Dashboard
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link href="/signup" className="group flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-white text-slate-950 font-semibold rounded-full hover:bg-slate-100 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-95">
                  Get Started
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/login" className="flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-800 text-white font-semibold rounded-full hover:bg-slate-800 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] active:scale-95 hover:border-slate-700">
                  Sign In to Portal
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 z-10">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-3xl hover:border-blue-500/30 transition-colors">
            <div className="w-12 h-12 bg-blue-500/20 text-blue-400 flex items-center justify-center rounded-2xl mb-6">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Multimodal AI</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Process ECG, vitals, and electronic health records simultaneously for a comprehensive cardiovascular risk profile.
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-3xl hover:border-emerald-500/30 transition-colors">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-2xl mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Enterprise Security</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Role-based access control with secure JWT authentication and strict Row Level Security policies for medical data.
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-3xl hover:border-teal-500/30 transition-colors">
            <div className="w-12 h-12 bg-teal-500/20 text-teal-400 flex items-center justify-center rounded-2xl mb-6">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Clinical Workflow</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Seamlessly link patients with their respective doctors for collaborative review and automated AI report generation.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-900">
        &copy; {new Date().getFullYear()} Omni-Fusion Healthcare. AI-assisted diagnostics platform.
      </footer>
    </div>
  )
}
