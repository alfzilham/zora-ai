"""
ZORA AI - Configuration Settings
=================================
Pydantic BaseSettings for environment variable management.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str

    # JWT Authentication
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str

    # App URLs
    APP_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    ENV: str = "development"
    DEVELOPER_EMAIL: str = ""
    VIDEO_API_ENABLED: bool = False

    # API Keys
    gemini_api_key: Optional[str] = None
    nano_banana_api_key: Optional[str] = None
    xendit_secret_key: Optional[str] = None
    xendit_webhook_token: Optional[str] = None
    XENDIT_SECRET_KEY: str = ""
    XENDIT_WEBHOOK_TOKEN: str = ""
    nvidia_api_key_nemotron: Optional[str] = None
    nvidia_api_key_deepseek: Optional[str] = None
    nvidia_api_key_qwen: Optional[str] = None
    nvidia_api_key_kimi: Optional[str] = None
    nvidia_api_key_minimax: Optional[str] = None
    nvidia_api_key_glm: Optional[str] = None
    nvidia_api_key_gemma: Optional[str] = None
    nvidia_api_key_mistral: Optional[str] = None
    nvidia_api_key_fallback: Optional[str] = None
    groq_api_key: Optional[str] = None

    # CORS Origins
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Generate CORS allowed origins list."""
        origins = [
            self.APP_URL,
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://localhost:5500",
            "https://localhost:3000",
            "https://localhost:5500",
            "https://zora-ai-zeta.vercel.app",
        ]
        # Remove duplicates while preserving order
        seen = set()
        unique_origins = []
        for origin in origins:
            if origin not in seen:
                seen.add(origin)
                unique_origins.append(origin)
        return unique_origins

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# Global settings instance
settings = Settings()
