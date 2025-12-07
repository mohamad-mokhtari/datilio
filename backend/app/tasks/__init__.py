"""
Celery Tasks Package
====================

This package contains all Celery tasks for asynchronous processing.

Available tasks:
----------------
- synthetic_data_tasks: Synthetic data generation tasks
"""

from app.tasks.synthetic_data_tasks import generate_synthetic_data_task

__all__ = ['generate_synthetic_data_task']

