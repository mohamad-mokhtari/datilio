"""
Celery Application Instance
============================

Import this module to get the configured Celery app instance.

Usage:
------
    from app.core.celery_app import celery_app
    
    @celery_app.task
    def my_task():
        # Your task code
        pass
"""

from app.core.celery_config import celery_app

__all__ = ['celery_app']

