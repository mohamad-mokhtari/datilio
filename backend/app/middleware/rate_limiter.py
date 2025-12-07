from slowapi import Limiter
from slowapi.util import get_remote_address


# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],  # Default rate limit for all endpoints
    storage_uri="memory://",  # Use in-memory storage (for production, use Redis)
)

