import os
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(dotenv_path)

HIGH_RISK_THRESHOLD_PCT: float = 60.0
TRIAGE_RED_THRESHOLD: float = 80.0
TRIAGE_ORANGE_THRESHOLD: float = 60.0
TRIAGE_YELLOW_THRESHOLD: float = 40.0

class Settings(BaseSettings):
    supabase_url: str = Field(..., env='SUPABASE_URL')
    supabase_service_role_key: str = Field(..., env='SUPABASE_SERVICE_ROLE_KEY')
    model_path: str = Field(..., env='MODEL_PATH')
    cors_origins: str = Field("http://localhost:3000", env='CORS_ORIGINS')
    environment: str = Field("development", env='ENVIRONMENT')
    gemini_api_key: str = Field(..., env='GEMINI_API_KEY')

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'), 
        env_file_encoding='utf-8', 
        extra='ignore'
    )

    @field_validator('supabase_url', 'supabase_service_role_key', 'model_path', 'gemini_api_key', mode='before')
    @classmethod
    def check_not_empty(cls, v, info):
        if not v or str(v).strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty. Please ensure it is set in backend/.env.")
        return v

try:
    settings = Settings()
except Exception as e:
    import sys
    print(f"\n[CRITICAL ERROR] Failed to load configuration:\n{e}\n")
    sys.exit(1)
