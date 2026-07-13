"""Role-aware dashboard analytics endpoints."""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.config import HIGH_RISK_THRESHOLD_PCT
from app.core.errors import handle_supabase_errors
from app.core.supabase_client import supabase
from app.models.enums import LinkStatus, Role

router = APIRouter()


@router.get("/analytics")
@handle_supabase_errors("fetch analytics")
async def get_analytics(user_data: dict = Depends(get_current_user)):
    user_id = user_data.get("auth").id
    role = user_data.get("profile").get("role")
    if role == Role.PATIENT.value:
        predictions = supabase.table("predictions").select("created_at, risk_score").eq("patient_id", user_id).order("created_at").execute()
        if not predictions.data:
            return {"trends": [], "average_risk": 0, "highest_risk": 0}
        scores = [item["risk_score"] for item in predictions.data]
        return {"trends": predictions.data, "average_risk": sum(scores) / len(scores), "highest_risk": max(scores)}
    if role == Role.DOCTOR.value:
        links = supabase.table("doctor_patient_links").select("patient_id").eq("doctor_id", user_id).eq("status", LinkStatus.ACCEPTED.value).execute()
        patient_ids = [item["patient_id"] for item in links.data]
        if not patient_ids:
            return {"total_patients": 0, "average_risk_all": 0, "high_risk_patients": 0}
        predictions = supabase.table("predictions").select("patient_id, risk_score").in_("patient_id", patient_ids).execute()
        scores = [item["risk_score"] for item in predictions.data]
        average = sum(scores) / len(scores) if scores else 0
        # Preserve the Phase 14 comparison exactly; threshold-unit reconciliation
        # is intentionally deferred because it would change computed UI values.
        high_risk = len({item["patient_id"] for item in predictions.data if item["risk_score"] > HIGH_RISK_THRESHOLD_PCT})
        return {"total_patients": len(patient_ids), "average_risk_all": average, "high_risk_patients": high_risk}
    return {}
