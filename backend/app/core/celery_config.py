"""
Celery Configuration
====================

This module configures Celery for asynchronous task processing.

Setup:
------
1. Install Redis: https://redis.io/download
2. Start Redis server: redis-server
3. Start Celery worker: celery -A app.core.celery_app worker --loglevel=info --pool=solo
4. (Optional) Start Flower for monitoring: celery -A app.core.celery_app flower

Architecture:
-------------
- Redis: Message broker and result backend
- Celery: Task queue and worker
- Flower: Web-based monitoring tool (optional)
"""

from celery import Celery
from app.core.config import settings

# Create Celery instance
celery_app = Celery(
    "datilio_tasks",
    broker=f"redis://localhost:6379/0",  # Redis as message broker
    backend=f"redis://localhost:6379/0",  # Redis as result backend
)

# Celery Configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={
        'master_name': 'mymaster'
    },
    
    # Task execution settings
    task_track_started=True,  # Track when tasks start
    task_time_limit=1800,  # Task timeout: 30 minutes
    task_soft_time_limit=1500,  # Soft timeout: 25 minutes
    
    # Retry settings (MVP: Automatic retry twice on failure)
    task_autoretry_for=(Exception,),  # Retry on any exception
    task_retry_kwargs={'max_retries': 1},  # Retry up to 2 times
    task_retry_backoff=True,  # Exponential backoff between retries
    task_retry_backoff_max=600,  # Max 10 minutes between retries
    task_retry_jitter=True,  # Add randomness to backoff to avoid thundering herd
    
    # Worker settings
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks
    
    # Broker settings
    broker_connection_retry_on_startup=True,
)

# Auto-discover tasks from all installed apps
celery_app.autodiscover_tasks(['app.tasks'])

if __name__ == '__main__':
    celery_app.start()

