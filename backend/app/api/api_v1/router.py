from fastapi import APIRouter
from app.api.api_v1.handlers.user import router as user_router
from app.api.api_v1.handlers.data import data_router
from app.api.api_v1.handlers.filter import filter_router
from app.api.api_v1.handlers.statistical import statistical_router
from app.api.api_v1.handlers.chart import chart_router
from app.api.api_v1.handlers.enums import enum_router
from app.api.auth.jwt import auth_router
from app.api.api_v1.handlers.synthetic_data_generator import synthetic_generator_router
from app.api.api_v1.handlers.list_of_user import list_router
from app.api.api_v1.handlers.llm import llm_router
from app.api.api_v1.handlers.pricing import router as pricing_router
from app.api.api_v1.handlers.rule import rule_router
from app.api.api_v1.handlers.feedback import feedback_router
from app.api.api_v1.handlers.email_verification import email_verification_router
from app.api.api_v1.handlers.error_monitoring import error_monitoring_router
from app.api.api_v1.handlers.dashboard import dashboard_router
from app.api.api_v1.handlers.admin_actions import admin_actions_router
from app.api.api_v1.blog import router as blog_router
from app.api.api_v1.handlers.preprocessing import preprocessing_router
from app.api.api_v1.handlers.ml_models import ml_router

router = APIRouter()

# User and Admin routes are now handled in the same router
router.include_router(user_router, prefix='/user', tags=['user'])
router.include_router(auth_router, prefix='/auth', tags=['auth'])
router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
router.include_router(data_router, prefix='/data', tags=['data'])
router.include_router(llm_router, prefix='/llm', tags=['llm'])
router.include_router(filter_router, prefix='/filtering', tags=['filtering'])
router.include_router(statistical_router, prefix='/statistical', tags=['statistical'])
router.include_router(chart_router, prefix='/chart', tags=['plot'])
router.include_router(enum_router, prefix='/enums', tags=['enums'])
router.include_router(synthetic_generator_router, prefix='/synthetic', tags=['synthetic'])
router.include_router(list_router, prefix='/lists', tags=['lists'])
router.include_router(pricing_router, prefix='/pricing', tags=['pricing'])
router.include_router(rule_router, prefix="/rules", tags=["rules"])
router.include_router(feedback_router, prefix="/feedback", tags=["feedback"])
router.include_router(email_verification_router, prefix="/email-verification", tags=["email-verification"])
router.include_router(error_monitoring_router, prefix="/admin/errors", tags=["error-monitoring"])
router.include_router(admin_actions_router, prefix="/admin", tags=["admin-actions"])
router.include_router(blog_router, prefix="/blog", tags=["blog"])
router.include_router(preprocessing_router, prefix="/preprocessing", tags=["preprocessing"])
router.include_router(ml_router, prefix="/ml", tags=["ml"])

