"""Doctor-patient discovery, connection, and listing endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.limiter import limiter

from app.core.auth import require_role
from app.core.errors import handle_supabase_errors
from app.core.supabase_client import supabase
from app.models.enums import LinkStatus, Role
from app.models.profile_schemas import LinkStatusUpdate

router = APIRouter()


def doctor_code(doctor_id: str) -> str:
    """Derive the stable human-readable connection code for a doctor UUID."""
    return f"OF-{doctor_id.replace('-', '')[:8].upper()}"


@router.get("/doctor-code")
async def get_doctor_code(user_data: dict = Depends(require_role([Role.DOCTOR]))):
    return {"code": doctor_code(user_data.get("auth").id)}


@router.post("/connect-by-code")
@limiter.limit("5/minute")
@handle_supabase_errors("connect patient by doctor code")
async def connect_by_code(request: Request, code: str, user_data: dict = Depends(require_role([Role.PATIENT]))):
    patient_id = user_data.get("auth").id
    normalized = code.strip().upper()
    doctors = supabase.table("profiles").select("id,full_name,specialization,hospital").eq("role", Role.DOCTOR.value).execute()
    doctor = next((item for item in doctors.data or [] if doctor_code(item["id"]) == normalized), None)
    if not doctor:
        raise HTTPException(status_code=404, detail="No doctor was found for that code")
    existing = supabase.table("doctor_patient_links").select("id").eq("doctor_id", doctor["id"]).eq("patient_id", patient_id).execute()
    if existing.data:
        supabase.table("doctor_patient_links").update({"status": LinkStatus.ACCEPTED.value}).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("doctor_patient_links").insert({"doctor_id": doctor["id"], "patient_id": patient_id, "status": LinkStatus.ACCEPTED.value}).execute()
    return {"message": "Connected successfully", "doctor": doctor}


@router.post("/link", status_code=201)
@handle_supabase_errors("create doctor link request")
async def request_link(doctor_id: str, user_data: dict = Depends(require_role([Role.PATIENT]))):
    patient_id = user_data.get("auth").id
    doctor = supabase.table("profiles").select("id").eq("id", doctor_id).eq("role", Role.DOCTOR.value).execute()
    if not doctor.data:
        raise HTTPException(status_code=404, detail="Doctor not found")
    result = supabase.table("doctor_patient_links").insert({"doctor_id": doctor_id, "patient_id": patient_id, "status": LinkStatus.PENDING.value}).execute()
    return {"message": "Request sent successfully", "link": result.data[0]}


@router.put("/link/{link_id}")
@handle_supabase_errors("update doctor link")
async def update_link_status(link_id: str, update: LinkStatusUpdate, user_data: dict = Depends(require_role([Role.DOCTOR]))):
    doctor_id = user_data.get("auth").id
    allowed = {LinkStatus.ACCEPTED.value, LinkStatus.REJECTED.value}
    if update.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = supabase.table("doctor_patient_links").update({"status": update.status}).eq("id", link_id).eq("doctor_id", doctor_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Link request not found")
    patient_id = result.data[0]["patient_id"]
    supabase.table("notifications").insert({"user_id": patient_id, "title": "Doctor Link Updated", "message": f"Your request has been {update.status}.", "type": "link_update"}).execute()
    return result.data[0]


@router.get("/patients")
@handle_supabase_errors("fetch doctor patients")
async def get_patients(user_data: dict = Depends(require_role([Role.DOCTOR]))):
    doctor_id = user_data.get("auth").id
    links = supabase.table("doctor_patient_links").select("*, profiles!patient_id(*)").eq("doctor_id", doctor_id).execute()
    return links.data
