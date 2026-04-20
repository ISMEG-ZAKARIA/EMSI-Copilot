import hashlib
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from app.core.config import settings

def hash_password(password: str) -> str:
    """
    Hashes a password using bcrypt with a SHA256 pre-hash to bypass the 72-byte limit.
    This is a standard production-grade approach (equivalent to passlib's bcrypt_sha256).
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    # Step 1: Pre-hash the password with SHA256
    # This ensures the input to bcrypt is always 32 bytes (64 hex characters),
    # which is well within the 72-byte limit of bcrypt.
    sha256_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    
    # Step 2: Hash with bcrypt
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(sha256_hash.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against a bcrypt hash with SHA256 pre-hashing.
    """
    if not plain_password or not hashed_password:
        return False
    
    try:
        # Step 1: Pre-hash the input password with SHA256
        sha256_hash = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
        
        # Step 2: Verify with bcrypt
        return bcrypt.checkpw(sha256_hash.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {
        "exp": int(expire.timestamp()), 
        "sub": str(subject)
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
