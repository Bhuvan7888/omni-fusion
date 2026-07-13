export interface VitalsInput {
  anchorAge: number; gender: number; creatinine: number; glucose: number;
  potassium: number; sodium: number; hr: number; sbp: number; dbp: number;
  rr: number; o2: number;
}

export type HistoricalInput = VitalsInput;

export interface PredictRequest {
  patientId: string;
  ecg: number[][];
  vitals: VitalsInput;
  historical?: HistoricalInput;
  uploadSessionId?: string;
}

export interface PredictResponse {
  predictionId: string; patientId: string; riskScore: number;
  shapData: Record<string, number>; ecgGradcamHeatmapB64: string;
  failureAnalysisSummary: string; streamsUsed: string[];
}

export interface UploadHistoricalResponse {
  sessionId: string; rowCount: number; imputationSummary: Record<string, number>;
  status: string; aggregatedData?: VitalsInput;
}

export interface ReportRequest {
  patientId: string; shapData: Record<string, number>;
  ecgGradcamHeatmapB64: string; failureAnalysisSummary: string;
}

export interface ReportResponse {
  predictionId: string; riskScore: number; shapData: Record<string, number>;
  failureAnalysisText: string; pdfStoragePath: string; pdfSignedUrl: string;
}

export interface HistoryItem {
  predictionId: string; createdAt: string; riskScore: number;
  streamsUsed: string[]; hasReport: boolean;
}
export interface HistoryResponse { items: HistoryItem[]; total: number }

export interface Profile {
  id: string; role: 'PATIENT' | 'DOCTOR'; fullName?: string; email?: string;
  age?: number; bmi?: number; smokingStatus?: string; specialization?: string;
  hospital?: string; phone?: string;
}
export interface ProfileInput extends Omit<Profile, 'id'> {
  dateOfBirth?: string | null; sex?: string; heightCm?: number | null;
  weightKg?: number | null; alcoholUse?: string; exerciseFrequency?: string;
  medicalRegistrationNumber?: string; bio?: string;
}
export interface AnalyticsTrend { createdAt: string; riskScore: number }
export interface ClinicalAnalytics {
  trends?: AnalyticsTrend[]; averageRisk?: number; highestRisk?: number;
  totalPatients?: number; averageRiskAll?: number; highRiskPatients?: number;
}
export interface DoctorProfile extends Profile { role: 'DOCTOR' }
export interface DoctorPatientLink { id: string; patientId: string; doctorId: string; status: 'pending' | 'accepted' | 'rejected'; createdAt: string; profiles: Profile }
export interface DoctorNote { id: string; note: string; createdAt: string; priority?: string }
export interface StoredReport { id: string; createdAt: string; pdfStoragePath: string; downloadUrl?: string; shapData?: Record<string, number>; failureAnalysisText?: string; ecgImageUrl?: string }
export interface StoredPrediction { id: string; createdAt: string; riskScore: number; streamsUsed?: string[]; reports: StoredReport[]; doctorNotes: DoctorNote[] }
export interface PatientRecord { profile: Profile; predictions: StoredPrediction[] }
export interface DoctorConnection { message: string; doctor: DoctorProfile }
