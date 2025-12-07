#!/usr/bin/env python3
"""
Script to seed the database with plans from CSV file.
Run this script after setting up the database and running migrations.
"""

import sys
import os
import csv
import json
import uuid as uuid_module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.db_setup import SessionLocal
from app.models.plan_model import Plan

def read_plans_from_csv(csv_path: str = "plans_and_add_on.csv"):
    """Read plans from CSV file"""
    plans = []
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Skip empty rows
            if not row.get('id') or not row.get('name'):
                continue
            
            # Parse features from JSON string
            try:
                features = json.loads(row['features'].replace('""', '"')) if row.get('features') else {}
            except:
                features = {}
            
            # Convert values to appropriate types
            plan_data = {
                'id': uuid_module.UUID(row['id'].strip()),
                'name': row['name'].strip(),
                'description': row['description'].strip() if row.get('description') else None,
                'price_monthly': float(row['price_monthly']) if row.get('price_monthly') else 0.0,
                'price_yearly': float(row['price_yearly']) if row.get('price_yearly') and row['price_yearly'].strip() else 0.0,
                'is_active': row['is_active'].strip().lower() in ['true', '1', 'yes'] if row.get('is_active') else True,
                'file_limit': int(row['file_limit']) if row.get('file_limit') else 1,
                'file_size_limit_mb': int(row['file_size_limit_mb']) if row.get('file_size_limit_mb') else 5,
                'storage_limit_gb': float(row['storage_limit_gb']) if row.get('storage_limit_gb') else 0.005,
                'rules_limit': int(row['rules_limit']) if row.get('rules_limit') else 1,
                'custom_lists_limit': int(row['custom_lists_limit']) if row.get('custom_lists_limit') else 1,
                'ai_prompts_per_month': int(row['ai_prompts_per_month']) if row.get('ai_prompts_per_month') else 100,
                'ai_tokens_per_month': int(row['ai_tokens_per_month']) if row.get('ai_tokens_per_month') else 50000,
                'synthetic_rows_per_month': int(row['synthetic_rows_per_month']) if row.get('synthetic_rows_per_month') else 500,
                'features': features,
                'is_addon': row['is_addon'].strip().lower() in ['true', '1', 'yes'] if row.get('is_addon') else False,
                'priority_processing': row['priority_processing'].strip().lower() in ['true', '1', 'yes'] if row.get('priority_processing') else False,
                'team_sharing': row['team_sharing'].strip().lower() in ['true', '1', 'yes'] if row.get('team_sharing') else False,
                'stripe_price_id_monthly': row['stripe_price_id_monthly'].strip() if row.get('stripe_price_id_monthly') and row['stripe_price_id_monthly'].strip() else None,
                'stripe_price_id_yearly': row['stripe_price_id_yearly'].strip() if row.get('stripe_price_id_yearly') and row['stripe_price_id_yearly'].strip() else None,
            }
            
            plans.append(plan_data)
    
    return plans

def main():
    """Seed the database with plans from CSV"""
    print("\n" + "=" * 70)
    print("🌱 Seeding Plans from CSV")
    print("=" * 70)
    
    db = SessionLocal()
    try:
        # Read plans from CSV
        plans_data = read_plans_from_csv("plans_and_add_on.csv")
        
        print(f"\n📄 Read {len(plans_data)} plans from CSV file")
        print("\nProcessing plans...")
        
        # Check and seed each plan
        added_count = 0
        updated_count = 0
        
        for plan_data in plans_data:
            # Check if plan already exists
            existing_plan = db.query(Plan).filter(Plan.id == plan_data['id']).first()
            
            if existing_plan:
                # Update existing plan
                for key, value in plan_data.items():
                    if key != 'id':
                        setattr(existing_plan, key, value)
                updated_count += 1
                print(f"   ✏️  Updated: {existing_plan.name}")
            else:
                # Create new plan
                new_plan = Plan(**plan_data)
                db.add(new_plan)
                added_count += 1
                print(f"   ➕ Added: {new_plan.name}")
        
        db.commit()
        
        print("\n" + "=" * 70)
        print("✅ Seeding Complete!")
        print(f"   • Added: {added_count} new plans")
        print(f"   • Updated: {updated_count} existing plans")
        print("=" * 70)
        
        # Display all active plans
        all_plans = db.query(Plan).filter(Plan.is_active == True).order_by(Plan.price_monthly).all()
        
        # Display main plans
        main_plans = [p for p in all_plans if not p.is_addon]
        if main_plans:
            print("\n💼 MAIN PLANS:")
            for plan in main_plans:
                print(f"\n   {plan.name} - ${plan.price_monthly}/month (${plan.price_yearly}/year)")
                print(f"   {plan.description}")
                print(f"   • Files: {plan.file_limit} × {plan.file_size_limit_mb}MB")
                print(f"   • Storage: {plan.storage_limit_gb} GB")
                print(f"   • AI Tokens: {plan.ai_tokens_per_month:,}/month")
                print(f"   • Synthetic: {plan.synthetic_rows_per_month:,} rows/month")
        
        # Display add-ons
        addons = [p for p in all_plans if p.is_addon]
        if addons:
            print("\n🔧 ADD-ONS:")
            for addon in addons:
                addon_type = addon.features.get('addon_type', 'unknown')
                print(f"   • {addon.name}: ${addon.price_monthly}/month ({addon_type})")
        
        print("\n" + "=" * 70)
        print("🎉 All plans loaded successfully!")
        print("=" * 70)
        print("\n💡 TIP: Plans are now in your database!")
        print("   View in Swagger: http://localhost:8000/docs")
        print("   Endpoint: GET /api/v1/pricing/plans\n")
        
    except FileNotFoundError:
        print("\n❌ Error: plans_and_add_on.csv file not found!")
        print("   Make sure the CSV file exists in the current directory.")
    except Exception as e:
        print(f"\n❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
