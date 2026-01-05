from pydantic_settings import BaseSettings
from pydantic import model_validator
from decouple import config
from typing import List


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    JWT_SECRET_KEY: str = config("JWT_SECRET_KEY", cast=str)
    JWT_REFRESH_SECRET_KEY: str = config("JWT_REFRESH_SECRET_KEY", cast=str)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 100
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Frontend URLs Configuration
    FRONTEND_BASE_URL: str = config("FRONTEND_BASE_URL", default="http://localhost:3000")
    ADMIN_FRONTEND_BASE_URL: str = config("ADMIN_FRONTEND_BASE_URL", default="http://localhost:3001")
    
    # CORS Configuration - dynamically built from frontend URLs
    BACKEND_CORS_ORIGINS: List[str] = []
    # Additional CORS origins (comma-separated, for development or additional frontends)
    ADDITIONAL_CORS_ORIGINS: str = config("ADDITIONAL_CORS_ORIGINS", default="")
    
    @model_validator(mode='after')
    def build_cors_origins(self):
        """Dynamically generate CORS origins from frontend URLs"""
        origins = [
            self.FRONTEND_BASE_URL,
            self.ADMIN_FRONTEND_BASE_URL,
        ]
        # Add localhost variants for development
        if "localhost" in self.FRONTEND_BASE_URL or "127.0.0.1" in self.FRONTEND_BASE_URL:
            # Extract port if present
            if ":" in self.FRONTEND_BASE_URL:
                port = self.FRONTEND_BASE_URL.split(":")[-1].rstrip("/")
                origins.extend([
                    f"http://localhost:{port}",
                    f"http://127.0.0.1:{port}",
                ])
        if "localhost" in self.ADMIN_FRONTEND_BASE_URL or "127.0.0.1" in self.ADMIN_FRONTEND_BASE_URL:
            if ":" in self.ADMIN_FRONTEND_BASE_URL:
                port = self.ADMIN_FRONTEND_BASE_URL.split(":")[-1].rstrip("/")
                origins.extend([
                    f"http://localhost:{port}",
                    f"http://127.0.0.1:{port}",
                ])
        
        # Add common development ports if not already included
        common_dev_ports = ["3000", "3001"]
        for port in common_dev_ports:
            localhost_url = f"http://localhost:{port}"
            localhost_ip = f"http://127.0.0.1:{port}"
            if localhost_url not in origins:
                origins.append(localhost_url)
            if localhost_ip not in origins:
                origins.append(localhost_ip)
        
        # Add additional CORS origins from environment variable
        if self.ADDITIONAL_CORS_ORIGINS:
            additional = [origin.strip() for origin in self.ADDITIONAL_CORS_ORIGINS.split(",") if origin.strip()]
            origins.extend(additional)
        
        # Remove duplicates while preserving order
        self.BACKEND_CORS_ORIGINS = list(dict.fromkeys(origins))
        return self
    
    PROJECT_NAME: str = "TodoApp"

    OPENAI_API_KEY: str = config("OPENAI_API_KEY", cast=str)

    # Database
    POSTGRESQL_CONNECTION_STRING: str = config("POSTGRESQL_CONNECTION_STRING", cast=str)
    DATABASE_DEFAULT: str = config("DATABASE_DEFAULT", cast=str)
    DATABASE_USER: str = config("DATABASE_USER", cast=str)
    DATABASE_PASSWORD: str = config("DATABASE_PASSWORD", cast=str)
    DATABASE_HOST: str = config("DATABASE_HOST", cast=str)
    DATABASE_PORT: int = config("DATABASE_PORT", cast=int)
    
    # Qdrant Vector Database
    QDRANT_HOST: str = config("QDRANT_HOST", default="localhost")
    QDRANT_PORT: int = config("QDRANT_PORT", default=6333, cast=int)
    
    # IndexedDB Storage Configuration
    INDEXEDDB_STORE_FOR_SPEED_AND_OFFLINE: bool = config("IndexedDB_STORE_FOR_SPEED_AND_OFFLINE", default=False, cast=bool)
    
    # Email Configuration
    SMTP_SERVER: str = config("SMTP_SERVER", default="smtp.gmail.com")
    SMTP_PORT: int = config("SMTP_PORT", default=587, cast=int)
    SMTP_USERNAME: str = config("SMTP_USERNAME", default="")
    SMTP_PASSWORD: str = config("SMTP_PASSWORD", default="")
    FROM_EMAIL: str = config("FROM_EMAIL", default="noreply@example.com")
    CONTACT_EMAIL: str = config("CONTACT_EMAIL", default="datilio@gmail.com")
    # Legacy support - use FRONTEND_BASE_URL if FRONTEND_URL is not set
    FRONTEND_URL: str = config("FRONTEND_URL", default="")
    
    @property
    def _frontend_url(self) -> str:
        """Get frontend URL, falling back to FRONTEND_BASE_URL if FRONTEND_URL is not set"""
        return self.FRONTEND_URL if self.FRONTEND_URL else self.FRONTEND_BASE_URL
    
    # Donation Configuration
    BUYMEACOFFEE_URL: str = config("BUYMEACOFFEE_URL", default="https://buymeacoffee.com/datilio")

    class Config:
        case_sensitive = True


settings = Settings()
