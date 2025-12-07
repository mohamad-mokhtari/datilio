from pydantic_settings import BaseSettings
from decouple import config
from typing import List


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    JWT_SECRET_KEY: str = config("JWT_SECRET_KEY", cast=str)
    JWT_REFRESH_SECRET_KEY: str = config("JWT_REFRESH_SECRET_KEY", cast=str)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 100
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
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
    FRONTEND_URL: str = config("FRONTEND_URL", default="http://localhost:5173")
    
    # Donation Configuration
    BUYMEACOFFEE_URL: str = config("BUYMEACOFFEE_URL", default="https://buymeacoffee.com/datilio")

    class Config:
        case_sensitive = True


settings = Settings()
