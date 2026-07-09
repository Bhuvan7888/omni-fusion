from fastapi import APIRouter, HTTPException, Path
from app.models.schemas import ReportRequest, ReportResponse
from app.services.pdf_service import pdf_service
from app.core.supabase_client import supabase
import uuid
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

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
            
        # Insert into reports table
        report_id = str(uuid.uuid4())
        supabase.table('reports').insert({
            'id': report_id,
            'prediction_id': prediction_id,
            'shap_data': request.shap_data,
            'gradcam_ref': "embedded_in_pdf",
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
