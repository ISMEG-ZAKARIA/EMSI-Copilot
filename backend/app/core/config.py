import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "EMSI Copilot"
    API_V1_STR: str = "/api/v1"
    
    # Database
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "NewStrongPassword123!")
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "db")
    MYSQL_PORT: str = os.getenv("MYSQL_PORT", "3306")
    MYSQL_DB: str = os.getenv("MYSQL_DB", "emsi_copilot")
    
    @property
    def SQLALCHEMY_DATABASE_URL(self) -> str:
        from urllib.parse import quote_plus
        # Encode password to handle special characters like '!'
        encoded_password = quote_plus(self.MYSQL_PASSWORD)
        return f"mysql+aiomysql://{self.MYSQL_USER}:{encoded_password}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Domains
    PROFESSOR_DOMAIN: str = "emsi.ma"
    STUDENT_DOMAIN: str = "emsi-edu.ma"
    
    # AI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    @property
    def AI_ENABLED(self) -> bool:
        return bool(self.OPENAI_API_KEY and self.OPENAI_API_KEY.strip())
    
    # CORS
    ALLOWED_HOSTS: list = [
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
