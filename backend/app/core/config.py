from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # 项目信息
    PROJECT_NAME: str = "AI 智能简历优化应用"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # 安全配置
    SECRET_KEY: str = "secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    # 数据库配置
    DATABASE_URL: Optional[str] = None
    
    # Redis 配置
    REDIS_URL: str = "redis://redis:6379/0"
    
    # AI 配置
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_API_BASE: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4"

    # DeepSeek 配置
    DEEPSEEK_API_KEY: Optional[str] = None
    DEEPSEEK_API_BASE: str = "https://api.deepseek.com"
    
    # CORS 配置
    ALLOWED_ORIGINS: str = "*"
    
    # 文件上传配置
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024
    
    class Config:
        env_file = ".env"
        extra = "allow" # 允许额外的环境变量

settings = Settings()
