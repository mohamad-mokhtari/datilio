#!/usr/bin/env python3
"""
Script to update database with real Stripe price IDs
Run this after creating products and prices in Stripe Dashboard
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.db_setup import SessionLocal
from app.models.plan_model import Plan

def update_price_ids():
    """Update database with real Stripe price IDs"""
    
    print("🔄 Updating database with real Stripe price IDs...")
    print("⚠️  IMPORTANT: Make sure you've created the products and prices in Stripe Dashboard first!")
    
    # Example price ID mappings - REPLACE THESE WITH YOUR ACTUAL STRIPE PRICE IDS
    price_id_mappings = {
        # Main Plans
        "Free": {
            "monthly": "price_1ABC123...",  # Replace with actual Stripe price ID
            "yearly": "price_1DEF456..."   # Replace with actual Stripe price ID
        },
        "Pro": {
            "monthly": "price_1GHI789...",  # Replace with actual Stripe price ID
            "yearly": "price_1JKL012..."   # Replace with actual Stripe price ID
        },
        "Business": {
            "monthly": "price_1MNO345...",  # Replace with actual Stripe price ID
            "yearly": "price_1PQR678..."   # Replace with actual Stripe price ID
        },
        # Addons
        "Extra Storage": {
            "monthly": "price_1STU901...",  # Replace with actual Stripe price ID
            "yearly": "price_1VWX234..."   # Replace with actual Stripe price ID
        },
        "Extra AI Tokens": {
            "monthly": "price_1YZA567...",  # Replace with actual Stripe price ID
            "yearly": "price_1BCD890..."   # Replace with actual Stripe price ID
        },
        "Extra Synthetic Data": {
            "monthly": "price_1EFG123...",  # Replace with actual Stripe price ID
            "yearly": "price_1HIJ456..."   # Replace with actual Stripe price ID
        }
    }
    
    db = SessionLocal()
    try:
        for plan_name, price_ids in price_id_mappings.items():
            plan = db.query(Plan).filter(Plan.name == plan_name).first()
            if plan:
                # Check if we have real price IDs (not placeholder ones)
                if not price_ids["monthly"].startswith("price_1ABC123"):
                    plan.stripe_price_id_monthly = price_ids["monthly"]
                    print(f"✅ Updated {plan_name} monthly price ID: {price_ids['monthly']}")
                else:
                    print(f"⚠️  Skipping {plan_name} monthly - placeholder price ID detected")
                
                if not price_ids["yearly"].startswith("price_1DEF456"):
                    plan.stripe_price_id_yearly = price_ids["yearly"]
                    print(f"✅ Updated {plan_name} yearly price ID: {price_ids['yearly']}")
                else:
                    print(f"⚠️  Skipping {plan_name} yearly - placeholder price ID detected")
            else:
                print(f"❌ Plan '{plan_name}' not found in database")
        
        db.commit()
        print("\n✅ Database updated successfully!")
        
    except Exception as e:
        print(f"❌ Error updating database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def show_current_price_ids():
    """Show current price IDs in database"""
    
    print("\n📋 CURRENT PRICE IDS IN DATABASE:")
    print("=" * 50)
    
    db = SessionLocal()
    try:
        plans = db.query(Plan).all()
        
        for plan in plans:
            print(f"\n📦 {plan.name} ({'Addon' if plan.is_addon else 'Main Plan'}):")
            print(f"   Monthly: {plan.stripe_price_id_monthly}")
            print(f"   Yearly:  {plan.stripe_price_id_yearly}")
            
    except Exception as e:
        print(f"❌ Error reading database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🎯 STRIPE PRICE ID UPDATER")
    print("=" * 30)
    
    show_current_price_ids()
    
    print("\n" + "=" * 50)
    print("📝 TO UPDATE WITH REAL PRICE IDS:")
    print("1. Edit this script and replace the placeholder price IDs")
    print("2. Run: python update_stripe_price_ids.py")
    print("3. Or use the interactive update below")
    
    response = input("\nDo you want to update price IDs now? (y/n): ").lower().strip()
    if response == 'y':
        update_price_ids()
    else:
        print("👋 Run this script again when you're ready to update!")
