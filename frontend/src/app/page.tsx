'use client';

import { useState } from 'react';
import { Activity, Download, ChevronRight, FileText } from 'lucide-react';
import FileUploadZone from '@/components/FileUploadZone';
import HistoryTimeline from '@/components/HistoryTimeline';
import ShapWaterfall from '@/components/ShapWaterfall';
import EcgHeatmap from '@/components/EcgHeatmap';
import { api } from '@/lib/api';
import { PredictResponse, ReportResponse, PredictRequest } from '@/lib/types';
import Link from 'next/link';

export default function Dashboard() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunInference = async () => {
    setIsPredicting(true);
    setError(null);
    try {
      // Create a noisy dummy ECG array so the model doesn't just see 0.0s
      const noisyEcg = Array(12).fill(0).map((_, i) => 
        Array(1000).fill(0).map((_, j) => Math.sin(j * 0.05 + i) * 0.5 + (Math.random() * 0.2))
      );

      // Extract vitals from historical if available, otherwise dummy
      const dummyVitals = {
        anchor_age: historicalData?.anchor_age ?? 65.0,
        gender: historicalData?.gender ?? 1,
        Creatinine: historicalData?.Creatinine ?? 1.1,
        Glucose: historicalData?.Glucose ?? 100.0,
        Potassium: historicalData?.Potassium ?? 4.0,
        Sodium: historicalData?.Sodium ?? 139.0,
        HR: historicalData?.HR ?? 82.0,
        SBP: historicalData?.SBP ?? 135.0,
        DBP: historicalData?.DBP ?? 80.0,
        RR: historicalData?.RR ?? 16.0,
        O2: historicalData?.O2 ?? 98.0
      };

      const payload: PredictRequest = {
        patient_id: `patient_${Math.floor(Math.random() * 1000)}`,
        ecg: noisyEcg,
        vitals: dummyVitals,
        historical: historicalData || undefined,
        upload_session_id: sessionId || undefined
      };

      const pred = await api.runInference(payload);
      setPrediction(pred);

      // Instantly generate report
      const rep = await api.generateReport(pred.prediction_id, {
        patient_id: payload.patient_id,
        shap_data: pred.shap_data,
        ecg_gradcam_heatmap_b64: pred.ecg_gradcam_heatmap_b64,
        failure_analysis_summary: pred.failure_analysis_summary
      });
      setReport(rep);

    } catch (err: any) {
      setError(err.message || 'Failed to run inference');
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <main className="min-h-screen p-8 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
              <Activity className="w-8 h-8 text-slate-100" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-50">Omni-Fusion Dashboard</h1>
              <p className="text-slate-400 mt-1">Multimodal Patient Risk Assessment</p>
            </div>
          </div>
          <Link href="/history" className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 transition-colors">
            <FileText className="w-5 h-5" />
            <span className="font-medium">View History</span>
          </Link>
        </header>

        {error && (
          <div className="w-full bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        {/* Top Section: Upload & Action */}
        <section className="w-full mb-12 bg-obsidian border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 w-full">
            <h2 className="text-lg font-semibold text-slate-200 mb-2">1. Patient Historical Data</h2>
            <p className="text-slate-500 text-sm mb-4">
              Upload a CSV of previous visits. Vitals and historical fields are derived from your upload. <br/>
              <span className="text-amber-400 font-medium">Note: ECG waveforms are purely synthetic for demo purposes regardless of your upload.</span>
            </p>
            <FileUploadZone onSessionCreated={(res) => {
              setSessionId(res.session_id);
              if (res.aggregated_data) {
                setHistoricalData(res.aggregated_data);
              }
            }} />
          </div>
          
          <div className="hidden md:flex flex-col items-center justify-center px-4">
            <ChevronRight className="w-8 h-8 text-slate-700" />
          </div>

          <div className="flex-1 w-full flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-8 md:pt-0 pl-0 md:pl-8">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">2. Run AI Model</h2>
            <button
              onClick={handleRunInference}
              disabled={isPredicting}
              className={`px-8 py-4 rounded-xl font-bold text-lg flex items-center space-x-2 transition-all ${
                isPredicting 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-100 text-slate-900 hover:bg-white hover:shadow-xl hover:shadow-white/10'
              }`}
            >
              {isPredicting ? (
                <span>Processing Streams...</span>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  <span>Execute Multimodal Inference</span>
                </>
              )}
            </button>
            {sessionId && !isPredicting && (
              <p className="text-green-400 text-sm mt-4">Session attached. Ready.</p>
            )}
          </div>
        </section>

        {/* Results Section */}
        {prediction && (
          <section className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Left Viewport */}
            <div className="flex flex-col space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">
                    Risk Score: <span className={prediction.risk_score > 0.5 ? 'text-red-400' : 'text-green-400'}>{(prediction.risk_score * 100).toFixed(1)}%</span>
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Streams combined: {prediction.streams_used.join(' + ')}</p>
                </div>
                {report && (
                  <a 
                    href={report.pdf_signed_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-700"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">PDF Report</span>
                  </a>
                )}
              </div>
              
              <ShapWaterfall shapData={prediction.shap_data} />
              
              <div className="w-full bg-slate-900 rounded-lg p-4 border border-slate-800">
                <h3 className="text-slate-300 font-semibold mb-4 text-sm">Longitudinal Medical History</h3>
                <HistoryTimeline />
              </div>
            </div>

            {/* Right Viewport */}
            <div className="flex flex-col">
              <EcgHeatmap 
                base64Image={prediction.ecg_gradcam_heatmap_b64}
                failureAnalysis={prediction.failure_analysis_summary}
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
