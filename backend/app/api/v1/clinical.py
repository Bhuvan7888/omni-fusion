from fastapi import APIRouter, Depends, HTTPException, status
import uuid
from typing import List
from app.core.supabase_client import supabase, logger
from app.core.auth import get_current_user, require_role
from app.models.clinical_schemas import (
    LinkStatusUpdate, DoctorNoteCreate, DoctorNoteResponse
)
from app.models.schemas import PredictRequest, PredictResponse
from app.services.inference_service import inference_service

router = APIRouter()

# 1. Doctor-Patient Linking
@router.post("/link", status_code=201)
async def request_link(doctor_id: str, user_data: dict = Depends(require_role(["PATIENT"]))):
    patient_id = user_data.get("auth").id
    
    # Verify doctor exists
    doc_res = supabase.table("profiles").select("id").eq("id", doctor_id).eq("role", "DOCTOR").execute()
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    try:
        res = supabase.table("doctor_patient_links").insert({
            "doctor_id": doctor_id,
            "patient_id": patient_id,
            "status": "pending"
        }).execute()
        return {"message": "Request sent successfully", "link": res.data[0]}
    except Exception as e:
        logger.error(f"Error creating link request: {e}")
        raise HTTPException(status_code=400, detail="Request already exists or invalid data")

@router.put("/link/{link_id}")
async def update_link_status(link_id: str, update: LinkStatusUpdate, user_data: dict = Depends(require_role(["DOCTOR"]))):
    doctor_id = user_data.get("auth").id
    if update.status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    try:
        res = supabase.table("doctor_patient_links").update({
            "status": update.status
        }).eq("id", link_id).eq("doctor_id", doctor_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Link request not found")
            
        # Create notification for patient
        patient_id = res.data[0]["patient_id"]
        supabase.table("notifications").insert({
            "user_id": patient_id,
            "title": "Doctor Link Updated",
            "message": f"Your request has been {update.status}.",
            "type": "link_update"
        }).execute()
            
        return res.data[0]
    except Exception as e:
        logger.error(f"Error updating link: {e}")
        raise HTTPException(status_code=500, detail="Failed to update link")

# 2. Patients List for Doctor
@router.get("/patients")
async def get_patients(user_data: dict = Depends(require_role(["DOCTOR"]))):
    doctor_id = user_data.get("auth").id
    try:
        # Fetch patients via links
        links = supabase.table("doctor_patient_links").select("*, profiles!patient_id(*)").eq("doctor_id", doctor_id).execute()
        return links.data
    except Exception as e:
        logger.error(f"Error fetching patients: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch patients")

# 3. Clinical Prediction (Authenticated Wrapper)
@router.post("/predict", response_model=PredictResponse)
def clinical_predict(request: PredictRequest, user_data: dict = Depends(require_role(["PATIENT"]))):
    patient_id = user_data.get("auth").id
    try:
        pred_res = inference_service.predict(request)
        prediction_id = str(uuid.uuid4())
        pred_res.prediction_id = prediction_id
        
        raw_input_ref = {
            "patient_id": patient_id, # Link directly to the authenticated user ID
            "has_vitals": True,
            "has_historical": request.historical is not None,
            "has_upload_session": request.upload_session_id is not None
        }

        # Find linked doctor to notify (if accepted)
        doc_links = supabase.table("doctor_patient_links").select("doctor_id").eq("patient_id", patient_id).eq("status", "accepted").execute()
        doc_id = doc_links.data[0]["doctor_id"] if doc_links.data else None

        supabase.table('predictions').insert({
            'id': prediction_id,
            'upload_session_id': request.upload_session_id,
            'risk_score': pred_res.risk_score,
            'streams_used': pred_res.streams_used,
            'raw_input_ref': raw_input_ref,
            'patient_id': patient_id,
            'doctor_id': doc_id
        }).execute()
        
        # Notify doctor if exists
        if doc_id:
            supabase.table("notifications").insert({
                "user_id": doc_id,
                "title": "New Patient Prediction",
                "message": "A patient has completed a new cardiovascular assessment.",
                "type": "new_prediction"
            }).execute()

        return pred_res
    except Exception as e:
        logger.error(f"Error during clinical prediction: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during prediction.")

# 4. Doctor Notes
@router.post("/notes", response_model=DoctorNoteResponse)
async def create_note(note: DoctorNoteCreate, user_data: dict = Depends(require_role(["DOCTOR"]))):
    doctor_id = user_data.get("auth").id
    try:
        # Check if doctor has access to this prediction (must be linked to the patient)
        pred_res = supabase.table("predictions").select("patient_id").eq("id", note.prediction_id).execute()
        if not pred_res.data:
            raise HTTPException(status_code=404, detail="Prediction not found")
        patient_id = pred_res.data[0]["patient_id"]
        
        link_res = supabase.table("doctor_patient_links").select("id").eq("doctor_id", doctor_id).eq("patient_id", patient_id).eq("status", "accepted").execute()
        if not link_res.data:
            raise HTTPException(status_code=403, detail="Not linked to this patient")

        data = note.model_dump()
        data["doctor_id"] = doctor_id
        
        res = supabase.table("doctor_notes").insert(data).execute()
        
        # Update prediction record
        supabase.table("predictions").update({
            "doctor_reviewed": True,
            "doctor_note": note.note,
            "reviewed_at": "now()"
        }).eq("id", note.prediction_id).execute()
        
        # Notify patient
        supabase.table("notifications").insert({
            "user_id": patient_id,
            "title": "Doctor Review Added",
            "message": f"Your doctor has reviewed your prediction and left a {note.priority} note.",
            "type": "clinical_review"
        }).execute()
        
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating note: {e}")
        raise HTTPException(status_code=500, detail="Failed to add note")

# 5. Dashboard Analytics
@router.get("/analytics")
async def get_analytics(user_data: dict = Depends(get_current_user)):
    user_id = user_data.get("auth").id
    role = user_data.get("profile").get("role")
    
    try:
        if role == "PATIENT":
            preds = supabase.table("predictions").select("created_at, risk_score").eq("patient_id", user_id).order("created_at").execute()
            if not preds.data:
                return {"trends": [], "average_risk": 0, "highest_risk": 0}
            
            scores = [p["risk_score"] for p in preds.data]
            return {
                "trends": preds.data,
                "average_risk": sum(scores)/len(scores),
                "highest_risk": max(scores)
            }
        elif role == "DOCTOR":
            links = supabase.table("doctor_patient_links").select("patient_id").eq("doctor_id", user_id).eq("status", "accepted").execute()
            patient_ids = [l["patient_id"] for l in links.data]
            
            if not patient_ids:
                return {"total_patients": 0, "average_risk_all": 0, "high_risk_patients": 0}
            
            # This is a basic analytics payload
            preds = supabase.table("predictions").select("patient_id, risk_score").in_("patient_id", patient_ids).execute()
            
            scores = [p["risk_score"] for p in preds.data]
            avg = sum(scores)/len(scores) if scores else 0
            
            high_risk_count = len(set([p["patient_id"] for p in preds.data if p["risk_score"] > 60.0]))
            
            return {
                "total_patients": len(patient_ids),
                "average_risk_all": avg,
                "high_risk_patients": high_risk_count
            }
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")
