from sqlalchemy.orm import Session
from app.models.plan_model import Plan
from typing import List
import uuid

class PlanSeeder:
    """Service to seed the database with default plans and add-ons"""
    
    @staticmethod
    def seed_plans(db: Session) -> List[Plan]:
        """Seed the database with default plans"""
        
        # Check if plans already exist
        existing_plans = db.query(Plan).filter(Plan.is_active == True).all()
        if existing_plans:
            print("Plans already exist, skipping seeding")
            return existing_plans
        
        plans = []
        
        # Free Plan
        free_plan = Plan(
            id=uuid.uuid4(),
            name="Free",
            description="Perfect for getting started with data analysis",
            price_monthly=0.0,
            price_yearly=0.0,
            stripe_price_id_monthly="price_free_monthly",
            stripe_price_id_yearly="price_free_yearly",
            is_active=True,
            file_limit=1,
            file_size_limit_mb=5,
            storage_limit_gb=0.005,  # 5MB
            rules_limit=1,
            custom_lists_limit=1,
            ai_prompts_per_month=100,
            ai_tokens_per_month=50000,
            synthetic_rows_per_month=500,
            features={
                "file_formats": ["csv", "json", "excel"],
                "data_viewer": True,
                "basic_analytics": True
            },
            is_addon=False,
            priority_processing=False,
            team_sharing=False
        )
        plans.append(free_plan)
        
        # MVP Plan
        mvp_plan = Plan(
            id=uuid.uuid4(),
            name="MVP",
            description="Enhanced free plan for MVP users with more features",
            price_monthly=0.0,
            price_yearly=0.0,
            stripe_price_id_monthly="price_free_monthly",
            stripe_price_id_yearly="price_free_yearly",
            is_active=True,
            file_limit=5,
            file_size_limit_mb=5,
            storage_limit_gb=20.0,  # 20GB
            rules_limit=10,
            custom_lists_limit=5,
            ai_prompts_per_month=200,
            ai_tokens_per_month=100000,
            synthetic_rows_per_month=1000,
            features={
                "file_formats": ["csv", "json", "excel"],
                "data_viewer": True,
                "basic_analytics": True,
                "mvp_features": True
            },
            is_addon=False,
            priority_processing=False,
            team_sharing=False
        )
        plans.append(mvp_plan)
        
        # Pro Plan
        pro_plan = Plan(
            id=uuid.uuid4(),
            name="Pro",
            description="For power users and small teams",
            price_monthly=9.0,
            price_yearly=90.0,  # 17% discount
            stripe_price_id_monthly="price_pro_monthly",
            stripe_price_id_yearly="price_pro_yearly",
            is_active=True,
            file_limit=10,
            file_size_limit_mb=50,
            storage_limit_gb=5.0,  # 5GB
            rules_limit=20,
            custom_lists_limit=-1,  # Unlimited
            ai_prompts_per_month=5000,
            ai_tokens_per_month=500000,
            synthetic_rows_per_month=20000,
            features={
                "file_formats": ["csv", "json", "excel"],
                "data_viewer": True,
                "advanced_analytics": True,
                "custom_dashboards": True,
                "export_formats": ["csv", "json", "excel", "pdf"]
            },
            is_addon=False,
            priority_processing=False,
            team_sharing=False
        )
        plans.append(pro_plan)
        
        # Business Plan
        business_plan = Plan(
            id=uuid.uuid4(),
            name="Business",
            description="For teams and organizations",
            price_monthly=29.0,
            price_yearly=290.0,  # 17% discount
            stripe_price_id_monthly="price_business_monthly",
            stripe_price_id_yearly="price_business_yearly",
            is_active=True,
            file_limit=50,
            file_size_limit_mb=200,
            storage_limit_gb=20.0,  # 20GB
            rules_limit=100,
            custom_lists_limit=-1,  # Unlimited
            ai_prompts_per_month=25000,
            ai_tokens_per_month=2000000,
            synthetic_rows_per_month=100000,
            features={
                "file_formats": ["csv", "json", "excel"],
                "data_viewer": True,
                "advanced_analytics": True,
                "custom_dashboards": True,
                "export_formats": ["csv", "json", "excel", "pdf"],
                "api_access": True,
                "white_label": True
            },
            is_addon=False,
            priority_processing=True,
            team_sharing=True
        )
        plans.append(business_plan)
        
        # Add-on Plans (Subscription-based)
        addons = [
            # Extra Storage Add-on
            Plan(
                id=uuid.uuid4(),
                name="Extra Storage",
                description="Additional storage space - 1GB per month",
                price_monthly=2.0,
                price_yearly=20.0,  # 17% discount
                stripe_price_id_monthly="price_storage_monthly",
                stripe_price_id_yearly="price_storage_yearly",
                is_active=True,
                file_limit=0,
                file_size_limit_mb=0,
                storage_limit_gb=1.0,  # 1GB per addon
                rules_limit=0,
                custom_lists_limit=0,
                ai_prompts_per_month=0,
                ai_tokens_per_month=0,
                synthetic_rows_per_month=0,
                features={
                    "addon_type": "storage",
                    "description": "1GB additional storage per month",
                    "unit": "GB",
                    "quantity": 1
                },
                is_addon=True,
                priority_processing=False,
                team_sharing=False
            ),
            # Extra Tokens Add-on
            Plan(
                id=uuid.uuid4(),
                name="Extra AI Tokens",
                description="Additional AI tokens for Talk to Data - 100k per month",
                price_monthly=3.0,
                price_yearly=30.0,  # 17% discount
                stripe_price_id_monthly="price_tokens_monthly",
                stripe_price_id_yearly="price_tokens_yearly",
                is_active=True,
                file_limit=0,
                file_size_limit_mb=0,
                storage_limit_gb=0,
                rules_limit=0,
                custom_lists_limit=0,
                ai_prompts_per_month=0,
                ai_tokens_per_month=100000,  # 100k tokens per addon
                synthetic_rows_per_month=0,
                features={
                    "addon_type": "tokens",
                    "description": "100,000 additional AI tokens per month",
                    "unit": "100k tokens",
                    "quantity": 1
                },
                is_addon=True,
                priority_processing=False,
                team_sharing=False
            ),
            # Extra Synthetic Data Add-on
            Plan(
                id=uuid.uuid4(),
                name="Extra Synthetic Data",
                description="Additional synthetic data generation - 10k rows per month",
                price_monthly=2.0,
                price_yearly=20.0,  # 17% discount
                stripe_price_id_monthly="price_synthetic_monthly",
                stripe_price_id_yearly="price_synthetic_yearly",
                is_active=True,
                file_limit=0,
                file_size_limit_mb=0,
                storage_limit_gb=0,
                rules_limit=0,
                custom_lists_limit=0,
                ai_prompts_per_month=0,
                ai_tokens_per_month=0,
                synthetic_rows_per_month=10000,  # 10k rows per addon
                features={
                    "addon_type": "synthetic_data",
                    "description": "10,000 additional synthetic rows per month",
                    "unit": "10k rows",
                    "quantity": 1
                },
                is_addon=True,
                priority_processing=False,
                team_sharing=False
            )
        ]
        
        plans.extend(addons)
        
        # Add all plans to database
        for plan in plans:
            db.add(plan)
        
        db.commit()
        
        print(f"Successfully seeded {len(plans)} plans")
        return plans
    
    @staticmethod
    def get_plan_by_name(db: Session, name: str) -> Plan:
        """Get a plan by name"""
        return db.query(Plan).filter(Plan.name == name, Plan.is_active == True).first()
    
    @staticmethod
    def get_addons(db: Session) -> List[Plan]:
        """Get all add-on plans"""
        return db.query(Plan).filter(Plan.is_addon == True, Plan.is_active == True).all()
    
    @staticmethod
    def get_main_plans(db: Session) -> List[Plan]:
        """Get all main plans (non-addons)"""
        return db.query(Plan).filter(Plan.is_addon == False, Plan.is_active == True).all()
