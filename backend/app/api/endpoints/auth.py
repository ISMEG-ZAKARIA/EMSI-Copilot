from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.models import User, Role
from app.core import security
from app.core.config import settings
from app.schemas.user import UserCreate, UserResponse, Token
from app.core.logging import logger

from app.api.deps import get_current_user

router = APIRouter()

@router.get("/test")
async def test_auth():
    return {"status": "ok", "message": "Auth router is reachable"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Role).where(Role.id == current_user.role_id))
    role = result.scalars().first()
    
    user_response = UserResponse.model_validate(current_user)
    if role:
        user_response.role_name = role.name
    return user_response

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(status_code=400, detail="User already registered")
    
    # Detect role based on domain
    domain = user_in.email.split("@")[-1]
    if domain == settings.PROFESSOR_DOMAIN:
        role_name = "Professor"
    elif domain == settings.STUDENT_DOMAIN:
        role_name = "Student"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration restricted to institutional domains ({settings.PROFESSOR_DOMAIN}, {settings.STUDENT_DOMAIN})"
        )
    
    role_result = await db.execute(select(Role).where(Role.name == role_name))
    role = role_result.scalars().first()
    
    if not role:
        raise HTTPException(status_code=500, detail=f"System error: Role '{role_name}' not found in database.")

    new_user = User(
        email=user_in.email,
        password_hash=security.hash_password(user_in.password),
        role_id=role.id
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    user_response = UserResponse.model_validate(new_user)
    user_response.role_name = role.name
    return user_response

@router.post("/login", response_model=Token)
async def login(db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    email = form_data.username.strip().lower()
    password = form_data.password
    logger.info(f"[Auth] Login attempt for: {email}")
    print(f"DEBUG: Password length: {len(password)}")
    
    # Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    
    if not user:
        logger.warning(f"[Auth] Login failed: User {email} not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Verify password correctly
    is_verified = security.verify_password(password, user.password_hash)
    if not is_verified:
        logger.warning(f"[Auth] Login failed: Incorrect password for {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"[Auth] Login successful for: {email}")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    return {
        "access_token": token,
        "token_type": "bearer",
    }
