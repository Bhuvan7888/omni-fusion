from fastapi import APIRouter, HTTPException, Path, Depends
from app.models.schemas import ReportRequest, ReportResponse
from app.services.pdf_service import pdf_service
from app.core.supabase_client import supabase
import uuid
import os
import logging
import base64
from app.core.auth import require_role

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/reports/mine")
def list_my_reports(user_data: dict = Depends(require_role(["PATIENT"]))):
    """Return the authenticated patient's persisted assessments and fresh download URLs."""
    patient_id = user_data.get("auth").id
    try:
        result = (
            supabase.table("predictions")
            .select("id,created_at,risk_score,reports(id,created_at,pdf_storage_path),doctor_notes(id,note,created_at)")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .execute()
        )

        for prediction in result.data or []:
            for report in prediction.get("reports") or []:
                path = report.get("pdf_storage_path")
                if path:
                    signed = supabase.storage.from_("reports").create_signed_url(path, 3600)
                    report["download_url"] = signed.get("signedURL") or signed.get("signedUrl") or ""
        return result.data or []
    except Exception as e:
        logger.error(f"Error listing patient reports: {e}")
        raise HTTPException(status_code=500, detail="Unable to load reports")

@router.post("/reports/{prediction_id}/ensure")
def ensure_archived_report(prediction_id: str, user_data: dict = Depends(require_role(["PATIENT"]))):
    """Return an existing PDF or create a downloadable summary for a legacy prediction."""
    patient_id = user_data.get("auth").id
    try:
        prediction_result = supabase.table("predictions").select("id,risk_score,streams_used,created_at,reports(id,pdf_storage_path)").eq("id", prediction_id).eq("patient_id", patient_id).single().execute()
        prediction = prediction_result.data
        if not prediction:
            raise HTTPException(status_code=404, detail="Analysis not found")
        existing = prediction.get("reports") or []
        if existing and existing[0].get("pdf_storage_path"):
            path = existing[0]["pdf_storage_path"]
            signed = supabase.storage.from_("reports").create_signed_url(path, 3600)
            return {"download_url": signed.get("signedURL") or signed.get("signedUrl") or "", "generated": False}

        streams = ", ".join(prediction.get("streams_used") or []) or "Not recorded"
        pdf_path = pdf_service.generate_report({
            "patient_id": patient_id,
            "prediction_id": prediction_id,
            "risk_score": prediction["risk_score"],
            "shap_data": {},
            "failure_analysis_summary": f"Archived analysis summary. Input streams used: {streams}. Detailed explainability artifacts were not retained for this legacy analysis.",
            "ecg_gradcam_heatmap_b64": "",
        })
        storage_path = f"generated_reports/{prediction_id}_{uuid.uuid4().hex[:8]}_archive.pdf"
        with open(pdf_path, "rb") as report_file:
            supabase.storage.from_("reports").upload(storage_path, report_file, file_options={"content-type": "application/pdf"})
        os.remove(pdf_path)
        supabase.table("reports").insert({
            "id": str(uuid.uuid4()), "prediction_id": prediction_id, "shap_data": {},
            "gradcam_ref": "legacy_not_available", "failure_analysis_text": "Archived summary report",
            "pdf_storage_path": storage_path,
        }).execute()
        signed = supabase.storage.from_("reports").create_signed_url(storage_path, 3600)
        return {"download_url": signed.get("signedURL") or signed.get("signedUrl") or "", "generated": True}
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Error ensuring archived report: {error}")
        raise HTTPException(status_code=500, detail="Unable to prepare this report")

@router.post("/report/{prediction_id}", response_model=ReportResponse)
def generate_report(request: ReportRequest, prediction_id: str = Path(...)):
    try:
        # Look up prediction
        pred_res = supabase.table('predictions').select('*').eq('id', prediction_id).execute()
        if not pred_res.data:
            raise HTTPException(status_code=404, detail="Prediction not found")
            
        prediction = pred_res.data[0]
        risk_score = prediction['risk_score']
        
        # Prepare data for PDF
        pdf_data = {
            "patient_id": request.patient_id,
            "prediction_id": prediction_id,
            "risk_score": risk_score,
            "shap_data": request.shap_data,
            "failure_analysis_summary": request.failure_analysis_summary,
            "ecg_gradcam_heatmap_b64": request.ecg_gradcam_heatmap_b64
        }
        
        # Generate PDF
        pdf_path = pdf_service.generate_report(pdf_data)
        
        # Upload to Supabase Storage
        file_name = f"{prediction_id}_{uuid.uuid4().hex[:8]}.pdf"
        storage_path = f"generated_reports/{file_name}"
        
        with open(pdf_path, 'rb') as f:
            supabase.storage.from_("reports").upload(storage_path, f, file_options={"content-type": "application/pdf"})
            
        # Cleanup local PDF
        os.remove(pdf_path)
        
        # Generate Signed URL (valid for 1 hour)
        signed_url_res = supabase.storage.from_("reports").create_signed_url(storage_path, 3600)
        signed_url = signed_url_res.get('signedURL', '')
        if not signed_url:
            signed_url = supabase.storage.from_("reports").get_public_url(storage_path)
            
        # Persist the ECG explanation separately so authorized clinicians can inspect it in-app.
        gradcam_ref = "embedded_in_pdf"
        if request.ecg_gradcam_heatmap_b64:
            try:
                image_data = request.ecg_gradcam_heatmap_b64.split(",", 1)[-1]
                gradcam_ref = f"generated_reports/{prediction_id}_{uuid.uuid4().hex[:8]}_ecg.png"
                supabase.storage.from_("reports").upload(
                    gradcam_ref,
                    base64.b64decode(image_data),
                    file_options={"content-type": "image/png"},
                )
            except Exception as image_error:
                logger.warning(f"Could not persist ECG visualization separately: {image_error}")
                gradcam_ref = "embedded_in_pdf"

        # Insert into reports table
        report_id = str(uuid.uuid4())
        supabase.table('reports').insert({
            'id': report_id,
            'prediction_id': prediction_id,
            'shap_data': request.shap_data,
            'gradcam_ref': gradcam_ref,
            'failure_analysis_text': request.failure_analysis_summary,
            'pdf_storage_path': storage_path
        }).execute()
        
        return ReportResponse(
            prediction_id=prediction_id,
            risk_score=risk_score,
            shap_data=request.shap_data,
            failure_analysis_text=request.failure_analysis_summary,
            pdf_storage_path=storage_path,
            pdf_signed_url=signed_url
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during report generation.")
