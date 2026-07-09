import {
  UploadHistoricalResponse,
  PredictRequest,
  PredictResponse,
  ReportRequest,
  ReportResponse,
  HistoryResponse,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage = `API error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // Fallback to basic text if not JSON
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  async uploadHistoricalCSV(file: File): Promise<UploadHistoricalResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<UploadHistoricalResponse>('/api/v1/upload-historical', {
      method: 'POST',
      body: formData,
    });
  }

  async runInference(payload: PredictRequest): Promise<PredictResponse> {
    return this.request<PredictResponse>('/api/v1/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async generateReport(predictionId: string, payload: ReportRequest): Promise<ReportResponse> {
    return this.request<ReportResponse>(`/api/v1/report/${predictionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async getHistory(limit: number = 20, offset: number = 0): Promise<HistoryResponse> {
    return this.request<HistoryResponse>(`/api/v1/history?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  }
}

export const api = new ApiClient();
