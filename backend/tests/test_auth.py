import pytest
from app.core.config import settings
from app.schemas.user import UserCreate

def test_user_domain_validation():
    # Professor domain should pass
    UserCreate(email="prof@emsi.ma", password="password123")
    
    # Student domain should pass
    UserCreate(email="student@emsi-edu.ma", password="password123")
    
    # Other domains should fail
    with pytest.raises(ValueError):
        UserCreate(email="hacker@gmail.com", password="password123")

def test_settings_load():
    assert settings.PROJECT_NAME == "EMSI Copilot"
    assert settings.PROFESSOR_DOMAIN == "emsi.ma"
