from fastapi import APIRouter, Depends, HTTPException, status
from app.core.supabase_client import supabase, logger
from app.core.auth import get_current_user
from app.models.clinical_schemas import ProfileCreate, ProfileUpdate, ProfileResponse

router = APIRouter()

def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    if not weight_kg or not height_cm or height_cm <= 0:
        return None
    height_m = height_cm / 100
    return round(weight_kg / (height_m * height_m), 2)

@router.get("/profiles/me", response_model=ProfileResponse)
async def get_my_profile(user_data: dict = Depends(get_current_user)):
    profile = user_data.get("profile")
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.post("/profiles/onboard", response_model=ProfileResponse)
async def onboard_profile(profile_data: ProfileCreate, user_data: dict = Depends(get_current_user)):
    user = user_data.get("auth")
    existing_profile = user_data.get("profile")
    
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already exists")
        
    data = profile_data.model_dump(exclude_unset=True)
    data["id"] = user.id
    
    if "weight_kg" in data and "height_cm" in data:
        data["bmi"] = calculate_bmi(data["weight_kg"], data["height_cm"])
        
    try:
        res = supabase.table("profiles").insert(data).execute()
        if not res.data:
            raise Exception("Insertion failed")
        return res.data[0]
    except Exception as e:
        logger.error(f"Error onboarding profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to create profile")

@router.put("/profiles/me", response_model=ProfileResponse)
async def update_profile(profile_data: ProfileUpdate, user_data: dict = Depends(get_current_user)):
    user = user_data.get("auth")
    profile = user_data.get("profile")
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    data = profile_data.model_dump(exclude_unset=True)
    
    # Recalculate BMI if needed
    weight = data.get("weight_kg", profile.get("weight_kg"))
    height = data.get("height_cm", profile.get("height_cm"))
    if weight and height:
        data["bmi"] = calculate_bmi(weight, height)
        
    try:
        res = supabase.table("profiles").update(data).eq("id", user.id).execute()
        if not res.data:
            raise Exception("Update failed")
        return res.data[0]
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")
