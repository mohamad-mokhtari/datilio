import uvicorn
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import logging

from app.api.api_v1.router import router
from app.api.public_routes import router as public_router
from app.core.config import settings
from app.core.db_setup import engine
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limiter import limiter
from app.models import (
    user_model,
    user_data_model,
    user_plan_model,
    plan_model,
    usage_tracking_model,
    stripe_payment_model,
    user_lists,
    email_verification_model,
    error_log_model,
    blog_model,
    task_model,
    preprocessed_data_model,
    ml_model_model
)

# Initialize all models
user_model.Base.metadata.create_all(bind=engine)
user_data_model.Base.metadata.create_all(bind=engine)
user_plan_model.Base.metadata.create_all(bind=engine)
plan_model.Base.metadata.create_all(bind=engine)
usage_tracking_model.Base.metadata.create_all(bind=engine)
stripe_payment_model.Base.metadata.create_all(bind=engine)
user_lists.Base.metadata.create_all(bind=engine)
email_verification_model.Base.metadata.create_all(bind=engine)
error_log_model.Base.metadata.create_all(bind=engine)
blog_model.Base.metadata.create_all(bind=engine)
task_model.Base.metadata.create_all(bind=engine)
preprocessed_data_model.Base.metadata.create_all(bind=engine)
ml_model_model.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Fast API LMS",
    description="GUI SCIENCE APP",
    version="0.0.1",
    contact={
        "name": "GUI_SCIENCE_APP",
        "email": "gui_science@example.com",
    },
    license_info={
        "name": "MIT",
    },
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from pathlib import Path
from fastapi.templating import Jinja2Templates
# Base directory (where main.py is located)
BASE_DIR = Path(__file__).resolve().parent
# Mount static directory at /static
app.mount("/static", StaticFiles(directory=BASE_DIR / "app" / "static"), name="static")

# Mount users_data_files directory at /static/users_data_files
app.mount("/static/users_data_files", StaticFiles(directory=BASE_DIR / "users_data_files"), name="users_data_files")

# Mount user images directory at /static/user_images
app.mount("/static/user_images", StaticFiles(directory=BASE_DIR / "app" / "static" / "user_images"), name="user_images")
# Set up the templates directory
templates = Jinja2Templates(directory=str(BASE_DIR / "app" / "templates"))

# # Mount static files
# app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Configure logging to write messages to a file
logging.basicConfig(
    filename="app_logs.txt",  # Specify the filename
    level=logging.DEBUG,  # Set the logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    format="%(asctime)s - %(levelname)s - %(message)s"  # Specify the log message format
)

# Configure CORS - MUST come before SecurityHeadersMiddleware to handle preflight requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Add security headers middleware (after CORS)
app.add_middleware(SecurityHeadersMiddleware)


# Global error handler
from app.middleware.error_handler import ErrorHandler

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return await ErrorHandler.handle_exception(request, exc)

# Include API routes
app.include_router(router, prefix=settings.API_V1_STR)

# Include public routes
app.include_router(public_router)


# ============================================================================
# HEALTH CHECK ENDPOINT (MVP: Simple Redis + Celery check)
# ============================================================================

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for Redis and Celery.
    
    🏥 **Checks:**
    - Redis connection (broker and backend)
    - Celery worker availability
    - Overall system status
    
    💡 **Use this for:**
    - Monitoring system health
    - CI/CD health checks
    - Load balancer health probes
    - Debugging connection issues
    
    ✅ **Healthy response:**
    ```json
    {
      "status": "healthy",
      "redis": "ok",
      "celery_workers": 1,
      "timestamp": "2025-10-23T10:30:00"
    }
    ```
    
    ⚠️ **Unhealthy response:**
    ```json
    {
      "status": "unhealthy",
      "redis": "down",
      "celery_workers": 0,
      "timestamp": "2025-10-23T10:30:00",
      "errors": ["Redis connection failed"]
    }
    ```
    """
    from datetime import datetime
    import redis
    from app.core.celery_app import celery_app
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "errors": []
    }
    
    # Check Redis connection
    try:
        redis_client = redis.Redis(host='localhost', port=6379, db=0, socket_connect_timeout=2)
        redis_client.ping()
        health_status["redis"] = "ok"
    except Exception as e:
        health_status["redis"] = "down"
        health_status["status"] = "unhealthy"
        health_status["errors"].append(f"Redis connection failed: {str(e)}")
    
    # Check Celery workers
    try:
        # Get active workers
        inspector = celery_app.control.inspect()
        active_workers = inspector.active()
        
        if active_workers:
            health_status["celery_workers"] = len(active_workers)
            health_status["celery"] = "ok"
        else:
            health_status["celery_workers"] = 0
            health_status["celery"] = "no_workers"
            health_status["status"] = "degraded"
            health_status["errors"].append("No Celery workers available")
    except Exception as e:
        health_status["celery_workers"] = 0
        health_status["celery"] = "unknown"
        health_status["status"] = "degraded"
        health_status["errors"].append(f"Celery check failed: {str(e)}")
    
    # Return appropriate status code
    status_code = 200 if health_status["status"] == "healthy" else 503
    
    return JSONResponse(
        status_code=status_code,
        content=health_status
    )


if __name__ == "__main__":
    print('start')
    uvicorn.run("main:app",  port=8000, reload=True)