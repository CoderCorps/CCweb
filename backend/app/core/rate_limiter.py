import time
from collections import defaultdict
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status

class SimpleRateLimiter:
    """
    Lightweight in-memory sliding window rate limiter for public security endpoints.
    Tracks timestamps per key (IP address or email string).
    """
    def __init__(self):
        # key -> list of timestamp floats
        self._requests: Dict[str, list] = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int = 3600) -> bool:
        now = time.time()
        cutoff = now - window_seconds
        
        # Clean up old timestamps
        timestamps = [ts for ts in self._requests[key] if ts > cutoff]
        self._requests[key] = timestamps

        if len(timestamps) >= max_requests:
            return False

        timestamps.append(now)
        return True

    def reset(self):
        self._requests.clear()

rate_limiter = SimpleRateLimiter()

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def check_forgot_password_rate_limit(request: Request, email: str = ""):
    ip = get_client_ip(request)
    
    # Enforce IP rate limit (max 5 requests per hour)
    if not rate_limiter.is_allowed(f"forgot_ip:{ip}", max_requests=5, window_seconds=3600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests from this IP. Please try again later."
        )

    # Enforce Email rate limit if email provided (max 3 requests per hour)
    clean_email = email.strip().lower() if email else ""
    if clean_email and not rate_limiter.is_allowed(f"forgot_email:{clean_email}", max_requests=3, window_seconds=3600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests for this email. Please try again later."
        )

def check_reset_verify_rate_limit(request: Request):
    ip = get_client_ip(request)
    if not rate_limiter.is_allowed(f"reset_verify_ip:{ip}", max_requests=10, window_seconds=3600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts. Please try again later."
        )

def check_reset_password_rate_limit(request: Request):
    ip = get_client_ip(request)
    if not rate_limiter.is_allowed(f"reset_submit_ip:{ip}", max_requests=5, window_seconds=3600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset attempts. Please try again later."
        )
