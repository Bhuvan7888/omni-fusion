"""Single prediction endpoint for authenticated and manual inference flows."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_optional_current_user
from app.core.supabase_client import supabase
from app.models.enums import LinkStatus, Role
from app.models.schemas import PredictRequest, PredictResponse
from app.services.inference_service import inference_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest, user_data: dict = Depends(get_optional_current_user)):
    """Run inference and persist it only for an authenticated patient."""
    try:
        prediction = inference_service.predict(request)
        prediction_id = str(uuid.uuid4())
        prediction.prediction_id = prediction_id

        profile = user_data.get("profile") if user_data else None
        if not profile or profile.get("role") != Role.PATIENT.value:
            # Manual/test predictions remain persisted for report generation, but
            # are deliberately not linked to the UUID-only patient profile column.
            supabase.table("predictions").insert({
                "id": prediction_id,
                "upload_session_id": request.upload_session_id,
                "risk_score": prediction.risk_score,
                "streams_used": prediction.streams_used,
                "raw_input_ref": {
                    "patient_id": request.patient_id,
                    "has_vitals": True,
                    "has_historical": request.historical is not None,
                    "has_upload_session": request.upload_session_id is not None,
                },
            }).execute()
            return prediction

        patient_id = user_data.get("auth").id
        raw_input_ref = {
            "patient_id": patient_id,
            "has_vitals": True,
            "has_historical": request.historical is not None,
            "has_upload_session": request.upload_session_id is not None,
        }
        links = supabase.table("doctor_patient_links").select("doctor_id").eq("patient_id", patient_id).eq("status", LinkStatus.ACCEPTED.value).execute()
        doctor_id = links.data[0]["doctor_id"] if links.data else None
        supabase.table("predictions").insert({
            "id": prediction_id,
            "upload_session_id": request.upload_session_id,
            "risk_score": prediction.risk_score,
            "streams_used": prediction.streams_used,
            "raw_input_ref": raw_input_ref,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
        }).execute()
        if doctor_id:
            supabase.table("notifications").insert({
                "user_id": doctor_id,
                "title": "New Patient Prediction",
                "message": "A patient has completed a new cardiovascular assessment.",
                "type": "new_prediction",
            }).execute()
        return prediction
    except HTTPException:
        raise
    except Exception as error:
        logger.error("Error during prediction: %s", error)
        raise HTTPException(status_code=500, detail="Internal Server Error during prediction.") from error
