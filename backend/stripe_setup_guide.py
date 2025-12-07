#!/usr/bin/env python3
"""
Script to help set up Stripe products and prices for subscription system
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.db_setup import SessionLocal
from app.models.plan_model import Plan
import stripe

# Configure Stripe (you'll need to set your secret key)
# stripe.api_key = "sk_test_..."  # Set this in your .env file

def print_stripe_setup_instructions():
    """Print instructions for setting up Stripe products and prices"""
    
    print("🎯 STRIPE DASHBOARD SETUP INSTRUCTIONS")
    print("=" * 50)
    
    print("\n1. 📦 CREATE PRODUCTS IN STRIPE DASHBOARD:")
    print("   Go to: https://dashboard.stripe.com/test/products")
    
    products = [
        {
            "name": "Free Plan",
            "description": "Perfect for getting started with data analysis",
            "prices": [
                {"id": "price_free_monthly", "amount": 0, "interval": "month"},
                {"id": "price_free_yearly", "amount": 0, "interval": "year"}
            ]
        },
        {
            "name": "Pro Plan", 
            "description": "For power users and small teams",
            "prices": [
                {"id": "price_pro_monthly", "amount": 900, "interval": "month"},  # $9.00
                {"id": "price_pro_yearly", "amount": 9000, "interval": "year"}   # $90.00
            ]
        },
        {
            "name": "Business Plan",
            "description": "For teams and organizations", 
            "prices": [
                {"id": "price_business_monthly", "amount": 2900, "interval": "month"},  # $29.00
                {"id": "price_business_yearly", "amount": 29000, "interval": "year"}   # $290.00
            ]
        },
        {
            "name": "Extra Storage",
            "description": "Additional storage space - 1GB per month",
            "prices": [
                {"id": "price_storage_monthly", "amount": 200, "interval": "month"},  # $2.00
                {"id": "price_storage_yearly", "amount": 2000, "interval": "year"}   # $20.00
            ]
        },
        {
            "name": "Extra AI Tokens",
            "description": "Additional AI tokens for Talk to Data - 100k per month",
            "prices": [
                {"id": "price_tokens_monthly", "amount": 300, "interval": "month"},  # $3.00
                {"id": "price_tokens_yearly", "amount": 3000, "interval": "year"}   # $30.00
            ]
        },
        {
            "name": "Extra Synthetic Data",
            "description": "Additional synthetic data generation - 10k rows per month",
            "prices": [
                {"id": "price_synthetic_monthly", "amount": 200, "interval": "month"},  # $2.00
                {"id": "price_synthetic_yearly", "amount": 2000, "interval": "year"}   # $20.00
            ]
        }
    ]
    
    for product in products:
        print(f"\n   📦 Product: {product['name']}")
        print(f"      Description: {product['description']}")
        for price in product['prices']:
            amount_dollars = price['amount'] / 100
            print(f"      💰 Price: {price['id']} - ${amount_dollars:.2f}/{price['interval']}")
    
    print("\n2. 🔗 WEBHOOK SETUP:")
    print("   Go to: https://dashboard.stripe.com/test/webhooks")
    print("   Add endpoint: https://yourdomain.com/api/v1/pricing/stripe/webhook")
    print("   Select events:")
    print("     - checkout.session.completed")
    print("     - customer.subscription.created") 
    print("     - customer.subscription.updated")
    print("     - customer.subscription.deleted")
    print("     - invoice.paid")
    
    print("\n3. 🔑 ENVIRONMENT VARIABLES:")
    print("   Add to your .env file:")
    print("   STRIPE_SECRET_KEY=sk_test_...")
    print("   STRIPE_WEBHOOK_SECRET=whsec_...")
    print("   STRIPE_SUCCESS_URL=http://localhost:3000/billing/success")
    print("   STRIPE_CANCEL_URL=http://localhost:3000/billing/cancel")
    
    print("\n4. 🧪 TESTING:")
    print("   Use Stripe test cards:")
    print("   - Success: 4242 4242 4242 4242")
    print("   - Decline: 4000 0000 0000 0002")
    print("   - 3D Secure: 4000 0025 0000 3155")

def update_database_with_real_price_ids():
    """Update database with real Stripe price IDs (run after creating in Stripe)"""
    
    print("\n🔄 TO UPDATE DATABASE WITH REAL PRICE IDS:")
    print("   1. Create the products/prices in Stripe Dashboard")
    print("   2. Copy the actual price IDs from Stripe")
    print("   3. Run: python update_stripe_price_ids.py")
    print("   4. Or manually update the database with the real IDs")

if __name__ == "__main__":
    print_stripe_setup_instructions()
    update_database_with_real_price_ids()
