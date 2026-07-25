from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends, BackgroundTasks
from app.services.historical_service import historical_service
from app.models.schemas import UploadHistoricalResponse
from app.core.limiter import limiter
from app.core.auth import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload-historical", response_model=UploadHistoricalResponse)
@limiter.limit("5/minute")
async def upload_historical(
    request: Request,
    file: UploadFile = File(...),
    user_data: dict = Depends(get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    try:
        contents = await file.read()
        result = historical_service.process_csv_upload(contents)
        return UploadHistoricalResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing historical CSV upload: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during file processing.")
