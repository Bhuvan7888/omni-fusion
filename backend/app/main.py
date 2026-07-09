from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.api.v1 import health, predict, historical, reports, history

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omni_fusion")

# Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])

app = FastAPI(
    title="Omni-Fusion Backend",
    version="1.0.0",
    description="Multimodal risk prediction and Explainable AI backend"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = '{0:.2f}'.format(process_time)
    logger.info(f"path={request.url.path} method={request.method} status={response.status_code} processing_time={formatted_process_time}ms")
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

# Wire up routers
app.include_router(health.router, prefix="/api/v1", tags=["System"])
app.include_router(predict.router, prefix="/api/v1", tags=["Inference"])
app.include_router(historical.router, prefix="/api/v1", tags=["Data Upload"])
app.include_router(reports.router, prefix="/api/v1", tags=["Reports"])
app.include_router(history.router, prefix="/api/v1", tags=["History"])

@app.on_event("startup")
def startup_event():
    logger.info("Application Startup Complete: Omni-Fusion Backend is Ready.")

