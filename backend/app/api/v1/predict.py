from fastapi import APIRouter, HTTPException
import uuid
from app.models.schemas import PredictRequest, PredictResponse
from app.services.inference_service import inference_service
from app.core.supabase_client import supabase
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    try:
        # Run inference
        pred_res = inference_service.predict(request)
        
        # Save to DB
        prediction_id = str(uuid.uuid4())
        pred_res.prediction_id = prediction_id
        
        # We store minimal input ref so the backend doesn't store huge JSONs
        raw_input_ref = {
            "patient_id": request.patient_id,
            "has_vitals": True,
            "has_historical": request.historical is not None,
            "has_upload_session": request.upload_session_id is not None
        }

        # Convert PredictResponse back to dict to return it correctly (pydantic handles it, but we mutated it)
        supabase.table('predictions').insert({
            'id': prediction_id,
            'upload_session_id': request.upload_session_id,
            'risk_score': pred_res.risk_score,
            'streams_used': pred_res.streams_used,
            'raw_input_ref': raw_input_ref
        }).execute()
        
        return pred_res
    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during prediction.")
