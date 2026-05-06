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
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # Twilio OTP
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_VERIFY_SERVICE_SID: str = ""

    # SMTP Email OTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""

    # App URLs
    APP_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    ENV: str = "development"
    DEVELOPER_EMAIL: str = ""
    VIDEO_API_ENABLED: bool = False

    # API Keys
    GEMINI_API_KEY: Optional[str] = None
    NANO_BANANA_API_KEY: Optional[str] = None
    # XENDIT_SECRET_KEY: Optional[str] = None      # dinonaktifkan, pindah ke Mayar
    # XENDIT_WEBHOOK_TOKEN: Optional[str] = None   # dinonaktifkan, pindah ke Mayar
    MAYAR_API_KEY: Optional[str] = None
    MAYAR_WEBHOOK_TOKEN: Optional[str] = None
    NVIDIA_API_KEY_NEMOTRON: Optional[str] = None
    NVIDIA_API_KEY_DEEPSEEK: Optional[str] = None
    NVIDIA_API_KEY_QWEN: Optional[str] = None
    NVIDIA_API_KEY_KIMI: Optional[str] = None
    NVIDIA_API_KEY_MINIMAX: Optional[str] = None
    NVIDIA_API_KEY_GLM: Optional[str] = None
    NVIDIA_API_KEY_GEMMA: Optional[str] = None
    NVIDIA_API_KEY_MISTRAL: Optional[str] = None
    NVIDIA_API_KEY_FALLBACK: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

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
