import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "supabase" in data["dependencies"]
    assert data["dependencies"]["supabase"] == "healthy"

def test_predict_endpoint():
    # Use dummy values that match our patient_13 from Phase 7 testing
    payload = {
        "patient_id": "patient_13",
        "ecg": [[0.0] * 1000] * 12,
        "vitals": {
            "anchor_age": 65.0,
            "gender": 1,
            "Creatinine": 1.2,
            "Glucose": 105.0,
            "Potassium": 4.1,
            "Sodium": 138.0,
            "HR": 85.0,
            "SBP": 140.0,
            "DBP": 85.0,
            "RR": 18.0,
            "O2": 96.0
        },
        "historical": {
            "anchor_age": 65.0,
            "gender": 1,
            "Creatinine": 1.1,
            "Glucose": 100.0,
            "Potassium": 4.0,
            "Sodium": 139.0,
            "HR": 82.0,
            "SBP": 135.0,
            "DBP": 80.0,
            "RR": 16.0,
            "O2": 98.0
        }
    }
    
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["patient_id"] == "patient_13"
    assert "risk_score" in data
    assert "shap_data" in data
    assert "ecg_gradcam_heatmap_b64" in data
    assert "failure_analysis_summary" in data
    assert data["streams_used"] == ["ecg", "vitals", "historical"]
    
    assert "Vital_HR" in data["shap_data"]
