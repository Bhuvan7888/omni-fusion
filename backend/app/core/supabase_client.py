import logging
from supabase import create_client, Client
from app.core.config import settings

# Setup standard logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("omni_fusion_backend")

# Initialize a single, reusable Supabase client using the Service Role Key
try:
    supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    logger.info("Supabase client initialized successfully with Service Role.")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    raise
