import os
from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import model_validator
from decouple import config
from typing import List
from urllib.parse import quote_plus

_REPO_ROOT = Path(__file__).resolve().parents[3]
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _load_env_file(path: Path) -> None:
    """Load KEY=VALUE lines into os.environ without overriding existing vars."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


# Root .env = database; backend/.env = app secrets (Docker sets these via env_file too)
_load_env_file(_REPO_ROOT / ".env")
_load_env_file(_BACKEND_ROOT / ".env")


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
        
        # For production: automatically add common production frontend subdomains
        # This handles cases where frontend is on a subdomain like front.datilio.com
        # Check if any origin contains datilio.com (production domain)
        has_datilio_domain = any("datilio.com" in str(origin) for origin in origins) or "datilio.com" in self.FRONTEND_BASE_URL
        
        if has_datilio_domain:
            # Add common frontend subdomains for datilio.com
            production_origins = [
                "https://front.datilio.com",
                "https://admin.datilio.com",
                "https://www.datilio.com",
                "https://datilio.com",
            ]
            for prod_origin in production_origins:
                if prod_origin not in origins:
                    origins.append(prod_origin)
        
        # Remove duplicates while preserving order
        self.BACKEND_CORS_ORIGINS = list(dict.fromkeys(origins))
        
        # Log CORS origins for debugging (only in development)
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"CORS allowed origins: {self.BACKEND_CORS_ORIGINS}")
        
        return self
    
    PROJECT_NAME: str = "TodoApp"

    OPENAI_API_KEY: str = config("OPENAI_API_KEY", cast=str)

    # Database — credentials live in repo root .env only (see DATABASE_* there)
    DATABASE_USER: str = config("DATABASE_USER", default="postgres")
    DATABASE_PASSWORD: str = config("DATABASE_PASSWORD", cast=str)
    DATABASE_HOST: str = config("DATABASE_HOST", default="postgres")
    DATABASE_PORT: int = config("DATABASE_PORT", default=5432, cast=int)
    DATABASE_DEFAULT: str = config("DATABASE_DEFAULT", default="datilio_db")

    @property
    def POSTGRESQL_CONNECTION_STRING(self) -> str:
        """Built from DATABASE_* in root .env — not read from environment."""
        password = quote_plus(self.DATABASE_PASSWORD)
        return (
            f"postgresql+psycopg2://{self.DATABASE_USER}:{password}"
            f"@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_DEFAULT}"
        )

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
