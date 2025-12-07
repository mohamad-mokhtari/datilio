import stripe
import os
from decouple import config

# Load Stripe API key from environment variables
stripe.api_key = config("STRIPE_SECRET_KEY", default="")

# Load webhook secret from environment variables
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET", default="")