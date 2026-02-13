from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # 项目信息
    PROJECT_NAME: str = "AI 智能简历优化应用"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # 安全配置
    SECRET_KEY: str = os.getenv("SECRET_KEY", "secret")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 天
    
    # 数据库配置
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    
    # Redis 配置
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    
    # AI 配置
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
    OPENAI_API_BASE: str = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")

    # DeepSeek 专用配置 (如果存在则优先)
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY")
    if DEEPSEEK_API_KEY and not OPENAI_API_KEY:
        OPENAI_API_KEY = DEEPSEEK_API_KEY
        OPENAI_API_BASE = "https://api.deepseek.com"
        OPENAI_MODEL = "deepseek-chat"
    
    # CORS 配置
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # 文件上传配置
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"

settings = Settings()
