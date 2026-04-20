from typing import Optional
from pydantic import BaseModel, EmailStr, validator, ConfigDict
from app.core.config import settings

class UserBase(BaseModel):
    email: Optional[EmailStr] = None

class UserCreate(UserBase):
    email: EmailStr
    password: str

    @validator("email")
    def validate_emsi_domain(cls, v):
        domain = v.split("@")[-1]
        if domain not in [settings.PROFESSOR_DOMAIN, settings.STUDENT_DOMAIN]:
            raise ValueError(f"Domain {domain} is not allowed. Use @emsi.ma or @emsi-edu.ma")
        return v

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    role_id: Optional[int]
    role_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None
