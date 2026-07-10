"use client"

import { Activity, BarChart, LineChart, PieChart } from 'lucide-react'

export default function DoctorAnalyticsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Practice Analytics</h1>
        <p className="text-slate-400">View aggregate insights across your patient population.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center mt-12">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
          <BarChart className="w-10 h-10 text-blue-400" />
        </div>
        <h3 className="text-2xl font-semibold text-white mb-3">Analytics Dashboard Coming Soon</h3>
        <p className="text-slate-400 max-w-lg mb-8">
          We are currently processing enough longitudinal data across your patient population to generate meaningful aggregate insights. This dashboard will automatically activate once sufficient data points are collected.
        </p>
        <div className="flex gap-4">
          <div className="flex items-center text-sm text-slate-500 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
            <Activity className="w-4 h-4 mr-2 text-emerald-500" />
            Data Collection Active
          </div>
        </div>
      </div>
    </div>
  )
}
