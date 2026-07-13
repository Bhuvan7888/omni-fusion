"""Detailed records available to a patient's connected doctor."""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import require_role
from app.core.errors import handle_supabase_errors
from app.core.supabase_client import supabase
from app.models.enums import LinkStatus, Role

router = APIRouter()


@router.get("/patients/{patient_id}/record")
@handle_supabase_errors("fetch patient record")
async def get_patient_record(patient_id: str, user_data: dict = Depends(require_role([Role.DOCTOR]))):
    doctor_id = user_data.get("auth").id
    link = supabase.table("doctor_patient_links").select("id").eq("doctor_id", doctor_id).eq("patient_id", patient_id).eq("status", LinkStatus.ACCEPTED.value).execute()
    if not link.data:
        raise HTTPException(status_code=403, detail="You are not connected to this patient")
    profile = supabase.table("profiles").select("*").eq("id", patient_id).single().execute()
    predictions = supabase.table("predictions").select("id,created_at,risk_score,streams_used,doctor_reviewed,reports(id,created_at,pdf_storage_path,gradcam_ref,shap_data,failure_analysis_text),doctor_notes(id,note,priority,created_at)").eq("patient_id", patient_id).order("created_at", desc=True).execute()
    for prediction in predictions.data or []:
        for report in prediction.get("reports") or []:
            path = report.get("pdf_storage_path")
            if path:
                signed = supabase.storage.from_("reports").create_signed_url(path, 3600)
                report["download_url"] = signed.get("signedURL") or signed.get("signedUrl") or ""
            gradcam_path = report.get("gradcam_ref")
            if gradcam_path and gradcam_path != "embedded_in_pdf":
                signed_image = supabase.storage.from_("reports").create_signed_url(gradcam_path, 3600)
                report["ecg_image_url"] = signed_image.get("signedURL") or signed_image.get("signedUrl") or ""
    return {"profile": profile.data, "predictions": predictions.data or []}
