export interface VitalsInput {
  anchor_age: number;
  gender: number;
  Creatinine: number;
  Glucose: number;
  Potassium: number;
  Sodium: number;
  HR: number;
  SBP: number;
  DBP: number;
  RR: number;
  O2: number;
}

export interface HistoricalInput {
  anchor_age: number;
  gender: number;
  Creatinine: number;
  Glucose: number;
  Potassium: number;
  Sodium: number;
  HR: number;
  SBP: number;
  DBP: number;
  RR: number;
  O2: number;
}

export interface PredictRequest {
  patient_id: string;
  ecg: number[][]; // 12x1000
  vitals: VitalsInput;
  historical?: HistoricalInput;
  upload_session_id?: string;
}

export interface PredictResponse {
  prediction_id: string;
  patient_id: string;
  risk_score: number;
  shap_data: Record<string, number>;
  ecg_gradcam_heatmap_b64: string;
  failure_analysis_summary: string;
  streams_used: string[];
}

export interface UploadHistoricalResponse {
  session_id: string;
  row_count: number;
  imputation_summary: Record<string, number>;
  status: string;
  aggregated_data?: Record<string, number>;
}

export interface ReportRequest {
  patient_id: string;
  shap_data: Record<string, number>;
  ecg_gradcam_heatmap_b64: string;
  failure_analysis_summary: string;
}

export interface ReportResponse {
  prediction_id: string;
  risk_score: number;
  shap_data: Record<string, number>;
  failure_analysis_text: string;
  pdf_storage_path: string;
  pdf_signed_url: string;
}

export interface HistoryItem {
  prediction_id: string;
  created_at: string;
  risk_score: number;
  streams_used: string[];
  has_report: boolean;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
}
