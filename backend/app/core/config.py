import os
from typing import List, Union, Any
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CoderCorps"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Cooldown in seconds for mentor approval pings (24 * 3600 = 86400 seconds / 24 hours)
    MENTOR_APPROVAL_COOLDOWN_SECONDS: int = int(os.getenv("MENTOR_APPROVAL_COOLDOWN_SECONDS", "86400"))
    
    # JWT Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/codercorps")
    
    # SMTP Email Settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    MAIL_TO: str = os.getenv("MAIL_TO", "codercorps@gmail.com")
    
    # CORS Origins (comma-separated string in env, parsed to list)
    BACKEND_CORS_ORIGINS: Any = ["http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(item) for item in v]
        return ["http://localhost:3000"]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
