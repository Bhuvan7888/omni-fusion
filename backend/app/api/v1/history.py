from fastapi import APIRouter, Query, HTTPException
from app.models.schemas import HistoryResponse, HistoryItem
from app.core.supabase_client import supabase
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/history", response_model=HistoryResponse)
def get_history(limit: int = Query(20, le=100), offset: int = Query(0)):
    try:
        # Get count
        count_res = supabase.table('predictions').select('*', count='exact').execute()
        total_count = count_res.count if count_res.count else 0
        
        # Get data with related reports
        res = supabase.table('predictions').select('id, created_at, risk_score, streams_used, reports(id)').order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        items = []
        for row in res.data:
            has_report = len(row.get('reports', [])) > 0
            
            items.append(HistoryItem(
                prediction_id=row['id'],
                created_at=row['created_at'],
                risk_score=row['risk_score'],
                streams_used=row['streams_used'],
                has_report=has_report
            ))
            
        return HistoryResponse(items=items, total=total_count)
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error fetching history.")
